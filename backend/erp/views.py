from datetime import datetime, timedelta
from math import asin, cos, radians, sin, sqrt
import base64
import json

from django.conf import settings
from django.core.cache import cache
from django.db.models import Count, Sum
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import (
    AttendanceRecord, AttendanceSettings, BonusRecord, CompanyInfo, ContactMessage, DeliveryTrip, Employee, ErpClient, ErpOrder,
    ErpProduct, FinancialTransaction, PayrollRecord, SalaryPayment, RawMaterial,
    SiteBeforeAfter, SiteContactInfo, SitePortfolioProject, WaybillTTN,
)
from .serializers import (
    AttendanceRecordSerializer, AttendanceSettingsSerializer,
    BonusRecordSerializer, CompanyInfoSerializer, ContactMessageSerializer, DeliveryTripSerializer, EmployeeSerializer,
    ErpClientSerializer, ErpOrderSerializer, ErpProductSerializer,
    FinancialTransactionSerializer, PayrollRecordSerializer, SalaryPaymentSerializer,
    RawMaterialSerializer, SiteBeforeAfterSerializer, SiteContactInfoSerializer,
    SitePortfolioProjectSerializer, WaybillTTNSerializer,
)

WAYBILL_STATUS_TO_TRIP = {
    'kutilmoqda': 'kutilmoqda',
    'yo_lda': 'yolda',
    'yetkazildi': 'yetkazildi',
}


class FinancialTransactionViewSet(viewsets.ModelViewSet):
    queryset = FinancialTransaction.objects.all()
    serializer_class = FinancialTransactionSerializer
    search_fields = ['category', 'description', 'related_client']
    ordering_fields = ['date', 'amount', 'id']


class RawMaterialViewSet(viewsets.ModelViewSet):
    queryset = RawMaterial.objects.all()
    serializer_class = RawMaterialSerializer
    search_fields = ['name', 'batch_number', 'supplier', 'category']
    ordering_fields = ['quantity', 'unit_cost', 'id']


class ErpProductViewSet(viewsets.ModelViewSet):
    queryset = ErpProduct.objects.all()
    serializer_class = ErpProductSerializer
    search_fields = ['name', 'sku', 'category', 'technique']
    ordering_fields = ['selling_price', 'stock_count', 'id']


class ErpOrderViewSet(viewsets.ModelViewSet):
    queryset = ErpOrder.objects.all()
    serializer_class = ErpOrderSerializer
    search_fields = ['order_number', 'client_name', 'company', 'product_name', 'status']
    ordering_fields = ['order_date', 'total_amount', 'id']

    def _validate_status_transition(self, order, new_status):
        """Buyurtma statusi o'zgartirish qoidalari."""
        is_fully_delivered = (order.delivered_quantity or 0) >= order.quantity

        # Qotish qoidasi: to'liq yetkazilgan buyurtmani o'zgartirib bo'lmaydi
        if order.status == 'yetkazildi' and is_fully_delivered and new_status != 'yetkazildi':
            return False, 'Bu buyurtma to‘liq yetkazilgan va holati qotirilgan (o‘zgartirib bo‘lmaydi)!'

        # To'liq jo'natilmaguncha "yetkazildi" belgilanmaydi
        if new_status == 'yetkazildi' and not is_fully_delivered:
            return False, (
                f"Buyurtma miqdori to‘liq jo‘natilmagan! "
                f"(Yetkazildi: {order.delivered_quantity or 0} / {order.quantity} dona). "
                f"Yuk xati (TTN) orqali to‘liq jo‘natilmaguncha bu status belgilanmaydi."
            )
        return True, None

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        new_status = request.data.get('status')
        if new_status and new_status != instance.status:
            valid, error = self._validate_status_transition(instance, new_status)
            if not valid:
                return Response({'detail': error}, status=status.HTTP_400_BAD_REQUEST)
        return super().update(request, *args, **kwargs)

    @action(detail=True, methods=['post'], url_path='status')
    def change_status(self, request, pk=None):
        order = self.get_object()
        new_status = request.data.get('status')
        if not new_status:
            return Response({'detail': 'status maydoni majburiy'}, status=status.HTTP_400_BAD_REQUEST)
        valid, error = self._validate_status_transition(order, new_status)
        if not valid:
            return Response({'detail': error}, status=status.HTTP_400_BAD_REQUEST)
        order.status = new_status
        order.save()
        return Response(self.get_serializer(order).data)


class ErpClientViewSet(viewsets.ModelViewSet):
    queryset = ErpClient.objects.all()
    serializer_class = ErpClientSerializer
    search_fields = ['name', 'company', 'phone', 'region', 'district']
    ordering_fields = ['total_spent', 'total_orders', 'id']


class EmployeeWebAuthnMixin:
    """Face ID (WebAuthn platform authenticator) ro'yxatdan o'tkazish va tasdiqlash."""

    @action(detail=True, methods=['post'], url_path='webauthn/register-options')
    def webauthn_register_options(self, request, pk=None):
        from webauthn import generate_registration_options
        from webauthn.helpers.structs import (
            AuthenticatorAttachment, AuthenticatorSelectionCriteria,
            ResidentKeyRequirement, UserVerificationRequirement,
        )
        employee = self.get_object()
        options = generate_registration_options(
            rp_id=WEBAUTHN_RP_ID,
            rp_name='BRENDOR ERP',
            user_id=str(employee.id).encode(),
            user_name=employee.full_name,
            user_display_name=employee.full_name,
            authenticator_selection=AuthenticatorSelectionCriteria(
                authenticator_attachment=AuthenticatorAttachment.PLATFORM,
                user_verification=UserVerificationRequirement.REQUIRED,
                resident_key=ResidentKeyRequirement.DISCOURAGED,
            ),
        )
        cache.set(_webauthn_challenge_key('reg', employee.id), options.challenge, 300)
        from webauthn import options_to_json
        return Response(json.loads(options_to_json(options)))

    @action(detail=True, methods=['post'], url_path='webauthn/register-verify')
    def webauthn_register_verify(self, request, pk=None):
        from webauthn import verify_registration_response
        from webauthn.helpers.structs import (
            AuthenticatorAttestationResponse, RegistrationCredential,
        )
        employee = self.get_object()
        challenge = cache.get(_webauthn_challenge_key('reg', employee.id))
        if not challenge:
            return Response({'detail': 'Challenge muddati tugagan — qayta urining.'}, status=status.HTTP_400_BAD_REQUEST)
        d = request.data if isinstance(request.data, dict) else {}
        try:
            credential = RegistrationCredential(
                id=d['id'],
                raw_id=_b64url_to_bytes(d['rawId']),
                response=AuthenticatorAttestationResponse(
                    client_data_json=_b64url_to_bytes(d['response']['clientDataJSON']),
                    attestation_object=_b64url_to_bytes(d['response']['attestationObject']),
                ),
                type=d.get('type', 'public-key'),
            )
            verification = verify_registration_response(
                credential=credential,
                expected_challenge=challenge,
                expected_rp_id=WEBAUTHN_RP_ID,
                expected_origin=WEBAUTHN_ORIGIN,
                require_user_verification=True,
            )
        except Exception as e:
            return Response({'detail': f'Face ID tasdiqlanmadi: {e}'}, status=status.HTTP_400_BAD_REQUEST)
        cache.delete(_webauthn_challenge_key('reg', employee.id))
        employee.webauthn_credential = json.dumps({
            'credential_id': _b64url_encode(verification.credential_id),
            'public_key': _b64url_encode(verification.credential_public_key),
            'sign_count': verification.sign_count,
        })
        employee.save(update_fields=['webauthn_credential'])
        return Response({'registered': True})

    @action(detail=True, methods=['post'], url_path='webauthn/auth-options')
    def webauthn_auth_options(self, request, pk=None):
        from webauthn import generate_authentication_options
        from webauthn.helpers.structs import PublicKeyCredentialDescriptor
        employee = self.get_object()
        allow = None
        if employee.webauthn_credential:
            try:
                stored = json.loads(employee.webauthn_credential)
                allow = [PublicKeyCredentialDescriptor(id=_b64url_to_bytes(stored['credential_id']))]
            except Exception:
                allow = None
        from webauthn.helpers.structs import UserVerificationRequirement
        options = generate_authentication_options(
            rp_id=WEBAUTHN_RP_ID,
            allow_credentials=allow,
            user_verification=UserVerificationRequirement.REQUIRED,
        )
        cache.set(_webauthn_challenge_key('auth', employee.id), options.challenge, 300)
        from webauthn import options_to_json
        return Response(json.loads(options_to_json(options)))

    @action(detail=True, methods=['post'], url_path='webauthn/auth-verify')
    def webauthn_auth_verify(self, request, pk=None):
        from webauthn import verify_authentication_response
        from webauthn.helpers.structs import (
            AuthenticatorAssertionResponse, AuthenticationCredential,
        )
        employee = self.get_object()
        if not employee.webauthn_credential:
            return Response({'detail': 'Bu xodim uchun Face ID ro‘yxatdan o‘tmagan.'}, status=status.HTTP_400_BAD_REQUEST)
        challenge = cache.get(_webauthn_challenge_key('auth', employee.id))
        if not challenge:
            return Response({'detail': 'Challenge muddati tugagan — qayta urining.'}, status=status.HTTP_400_BAD_REQUEST)
        d = request.data if isinstance(request.data, dict) else {}
        try:
            stored = json.loads(employee.webauthn_credential)
            resp = d.get('response', {})
            credential = AuthenticationCredential(
                id=d['id'],
                raw_id=_b64url_to_bytes(d['rawId']),
                response=AuthenticatorAssertionResponse(
                    client_data_json=_b64url_to_bytes(resp['clientDataJSON']),
                    authenticator_data=_b64url_to_bytes(resp['authenticatorData']),
                    signature=_b64url_to_bytes(resp['signature']),
                    user_handle=_b64url_to_bytes(resp['userHandle']) if resp.get('userHandle') else None,
                ),
                type=d.get('type', 'public-key'),
            )
            verification = verify_authentication_response(
                credential=credential,
                expected_challenge=challenge,
                expected_rp_id=WEBAUTHN_RP_ID,
                expected_origin=WEBAUTHN_ORIGIN,
                credential_public_key=_b64url_to_bytes(stored['public_key']),
                credential_current_sign_count=int(stored.get('sign_count', 0)),
                require_user_verification=True,
            )
        except Exception as e:
            return Response({'detail': f'Face ID tasdiqlanmadi: {e}'}, status=status.HTTP_400_BAD_REQUEST)
        cache.delete(_webauthn_challenge_key('auth', employee.id))
        stored['sign_count'] = verification.new_sign_count
        employee.webauthn_credential = json.dumps(stored)
        employee.save(update_fields=['webauthn_credential'])
        return Response({'verified': True})


class EmployeeViewSet(EmployeeWebAuthnMixin, viewsets.ModelViewSet):
    queryset = Employee.objects.all()
    serializer_class = EmployeeSerializer
    search_fields = ['full_name', 'position', 'phone']
    ordering_fields = ['salary', 'id']


class PayrollRecordViewSet(viewsets.ModelViewSet):
    queryset = PayrollRecord.objects.all()
    serializer_class = PayrollRecordSerializer
    search_fields = ['employee_name', 'position', 'department', 'month', 'status']
    ordering_fields = ['net_salary', 'payment_date', 'id']

    def create(self, request, *args, **kwargs):
        # Nofaol xodimga oylik yozish taqiqlanadi
        emp_id = request.data.get('employee') or request.data.get('employee_id')
        if emp_id:
            try:
                emp = Employee.objects.get(pk=emp_id)
                if emp.status == 'nofaol':
                    return Response(
                        {'detail': 'Nofaol xodimga oylik yozib bo‘lmaydi!'},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
            except Employee.DoesNotExist:
                pass
        return super().create(request, *args, **kwargs)

    @action(detail=True, methods=['post'], url_path='status')
    def change_status(self, request, pk=None):
        record = self.get_object()
        new_status = request.data.get('status')
        if not new_status:
            return Response({'detail': 'status maydoni majburiy'}, status=status.HTTP_400_BAD_REQUEST)
        record.status = new_status
        if new_status == 'to_langan' and not record.payment_date:
            record.payment_date = timezone.now().date()
        record.save()
        return Response(self.get_serializer(record).data)


class BonusRecordViewSet(viewsets.ModelViewSet):
    queryset = BonusRecord.objects.all()
    serializer_class = BonusRecordSerializer
    search_fields = ['employee_name', 'kpi_type', 'status']
    ordering_fields = ['amount', 'date', 'id']

    def create(self, request, *args, **kwargs):
        # Nofaol xodimga bonus yozish taqiqlanadi
        emp_id = request.data.get('employee') or request.data.get('employee_id')
        if emp_id:
            try:
                emp = Employee.objects.get(pk=emp_id)
                if emp.status == 'nofaol':
                    return Response(
                        {'detail': 'Nofaol xodimga bonus yozib bo‘lmaydi!'},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
            except Employee.DoesNotExist:
                pass
        return super().create(request, *args, **kwargs)


class WaybillTTNViewSet(viewsets.ModelViewSet):
    queryset = WaybillTTN.objects.all()
    serializer_class = WaybillTTNSerializer
    search_fields = ['ttn_number', 'order_number', 'receiver_company', 'sender_company', 'status']
    ordering_fields = ['issue_date', 'total_sum', 'id']

    def create(self, request, *args, **kwargs):
        response = super().create(request, *args, **kwargs)
        waybill = WaybillTTN.objects.get(pk=response.data['id'])
        self._apply_waybill_business_logic(waybill)
        return response

    def _apply_waybill_business_logic(self, waybill):
        """Yuk xati yaratilganda avtomatik biznes-amallar:
        1) Moliya tranzaksiyasi (sotuv → kirim, xarid → chiqim)
        2) Bog'langan buyurtma miqdori/statusi yangilanadi
        3) HAR BIR YUK XATI ALOHIDA YETKAZIB BERISH REYSI yaratiladi
        4) Tayyor mahsulotlar omboridagi qoldiq yangilanadi
        """
        # 1) Avtomatik moliya tranzaksiyasi
        is_xarid = waybill.category == 'xarid'
        FinancialTransaction.objects.create(
            type='chiqim' if is_xarid else 'kirim',
            category='Xarid (Yuk xati - Xomashyo/Material)' if is_xarid else 'Sotuv (Yuk xati - Mahsulot)',
            amount=waybill.total_sum,
            payment_method='bank_transfer',
            date=waybill.issue_date,
            description=(
                f"{waybill.ttn_number} - {waybill.sender_company} dan xomashyo/tovar xaridi (Yuk xati)"
                if is_xarid else
                f"{waybill.ttn_number} - {waybill.receiver_company} ga mahsulot yetkazildi (Sotuv)"
            ),
            related_client=waybill.receiver_company if not is_xarid else waybill.sender_company,
            related_order=waybill.order,
        )

        # 2) Bog'langan buyurtma yangilanadi
        if waybill.order:
            shipped_qty = sum(item.quantity for item in waybill.items.all())
            order = waybill.order
            order.delivered_quantity = (order.delivered_quantity or 0) + shipped_qty
            if order.delivered_quantity >= order.quantity:
                order.status = 'yetkazildi'
            else:
                order.status = 'jonatildi'
            order.ttn_number = (
                f"{order.ttn_number}, {waybill.ttn_number}" if order.ttn_number else waybill.ttn_number
            )
            order.save()

        # 3) Har yuk xati alohida yetkazib berish reysi
        num_waybills = WaybillTTN.objects.filter(order=waybill.order).count() if waybill.order else 1
        trip_code = f"REYS-{waybill.ttn_number.split('-')[-1] if '-' in waybill.ttn_number else num_waybills}"
        DeliveryTrip.objects.create(
            trip_code=trip_code,
            driver_name=waybill.driver_name or '',
            vehicle_model=waybill.vehicle_model or '',
            vehicle_plate=waybill.vehicle_plate or '',
            destination_address=waybill.receiver_address,
            client_name=waybill.receiver_company,
            order_number=waybill.order_number,
            cargo_summary=', '.join(
                f"{item.quantity} {item.unit} {item.name}" for item in waybill.items.all()
            ),
            status=WAYBILL_STATUS_TO_TRIP.get(waybill.status, 'kutilmoqda'),
            departure_time=(
                f"{waybill.issue_time.strftime('%H:%M') if waybill.issue_time else ''}, {waybill.issue_date}"
            ),
            waybill=waybill,
            waybill_ttn_number=waybill.ttn_number,
        )

        # 4) Tayyor mahsulotlar omboridan ayirish
        for item in waybill.items.all():
            product = ErpProduct.objects.filter(name__iexact=item.name.strip()).first()
            if product:
                product.stock_count = max(0, product.stock_count - int(item.quantity))
                product.sold_count = (product.sold_count or 0) + int(item.quantity)
                product.save()

    @action(detail=True, methods=['post'], url_path='status')
    def change_status(self, request, pk=None):
        waybill = self.get_object()
        new_status = request.data.get('status')
        if not new_status:
            return Response({'detail': 'status maydoni majburiy'}, status=status.HTTP_400_BAD_REQUEST)
        waybill.status = new_status
        waybill.save()

        # Bog'langan reyslarni sinxronlash (qotirilgan reys o'zgarmaydi)
        trip_status = WAYBILL_STATUS_TO_TRIP.get(new_status)
        if trip_status:
            waybill.trips.exclude(status='yetkazildi').update(status=trip_status)

        return Response(self.get_serializer(waybill).data)


class CompanyInfoViewSet(viewsets.ModelViewSet):
    queryset = CompanyInfo.objects.all()
    serializer_class = CompanyInfoSerializer


class ContactMessageViewSet(viewsets.ModelViewSet):
    queryset = ContactMessage.objects.all()
    serializer_class = ContactMessageSerializer
    search_fields = ['name', 'phone', 'email', 'message', 'status']
    ordering_fields = ['created_at', 'id']


class SiteContactInfoViewSet(viewsets.ViewSet):
    """Yagona aloqa yozuvi: GET /api/site/contact-info/, POST yangilash."""

    def list(self, request):
        obj = SiteContactInfo.get_solo()
        return Response(SiteContactInfoSerializer(obj).data)

    def create(self, request):
        obj = SiteContactInfo.get_solo()
        data = request.data if isinstance(request.data, dict) else {}
        allowed = {
            'phone1', 'phone2', 'email', 'telegram', 'instagram',
            'address', 'address_ru', 'working_hours', 'working_hours_ru',
        }
        clean = {k: v for k, v in data.items() if k in allowed}
        ser = SiteContactInfoSerializer(obj, data=clean, partial=True)
        ser.is_valid(raise_exception=True)
        ser.save()
        return Response(ser.data)


class SitePortfolioProjectViewSet(viewsets.ModelViewSet):
    queryset = SitePortfolioProject.objects.all()
    serializer_class = SitePortfolioProjectSerializer
    search_fields = ['external_id', 'business_type']
    ordering_fields = ['id', 'updated_at']

    def get_queryset(self):
        qs = super().get_queryset()
        lang = self.request.query_params.get('lang')
        if lang in ('uz', 'ru'):
            qs = qs.filter(lang=lang)
        return qs


class SiteBeforeAfterViewSet(viewsets.ViewSet):
    """Slayder kontenti: GET /api/site/slider/?lang=uz, POST {lang, data} saqlash."""

    def _get_obj(self, lang: str) -> SiteBeforeAfter:
        if lang not in ('uz', 'ru'):
            lang = 'uz'
        obj, _ = SiteBeforeAfter.objects.get_or_create(
            lang=lang, defaults={'data': {}}
        )
        return obj

    def list(self, request):
        lang = request.query_params.get('lang', 'uz')
        return Response(SiteBeforeAfterSerializer(self._get_obj(lang)).data)

    def create(self, request):
        data = request.data if isinstance(request.data, dict) else {}
        lang = str(data.get('lang') or request.query_params.get('lang', 'uz'))
        obj = self._get_obj(lang)
        payload = data.get('data')
        if not isinstance(payload, dict):
            return Response(
                {'detail': 'data maydoni obyekt bo‘lishi shart.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        obj.data = payload
        obj.save()
        return Response(SiteBeforeAfterSerializer(obj).data)


class AuthViewSet(viewsets.ViewSet):
    """Kirish (login) API: veb-saytga faqat admin, mobil ilovaga faqat xodim.

    Himoya qatlamlari:
    - DRF scoped throttle (login: 10/min),
    - IP+login bo'yicha 5 xato urinishdan so'ng 15 daqiqa blok (brute-force/DoS),
    - kirish validatsiyasi (SQL injection belgilari erta rad etiladi),
    - xato javoblar umumiy (foydalanuvchi ro'yxatini aniqlashga yo'l qo'yilmaydi).
    """
    throttle_scope = 'login'

    @action(detail=False, methods=['post'], url_path='login')
    def login(self, request):
        from .auth_security import (
            clear_login_fails, get_client_ip, hash_password,
            is_locked_out, record_login_fail, validate_login_input,
            verify_password,
        )
        data = request.data if isinstance(request.data, dict) else {}
        login = str(data.get('login', '')).strip()
        password = str(data.get('password', ''))
        client = str(data.get('client', 'web'))
        if client not in ('web', 'mobile'):
            client = 'web'

        err = validate_login_input(login, password)
        if err:
            return Response({'detail': err}, status=status.HTTP_400_BAD_REQUEST)

        ip = get_client_ip(request)
        if is_locked_out(ip, login):
            return Response(
                {'detail': 'Juda ko‘p muvaffaqiyatsiz urinish. 15 daqiqadan so‘ng qayta urinib ko‘ring.'},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        # 1) Admin tekshiruvi
        company = CompanyInfo.objects.first()
        if company and company.admin_login and company.admin_login == login:
            ok, upgrade = verify_password(company.admin_password or '', password)
            if ok:
                if upgrade:
                    CompanyInfo.objects.filter(pk=company.pk).update(admin_password=hash_password(password))
                clear_login_fails(ip, login)
                return Response({
                    'role': 'admin',
                    'name': company.admin_name or 'Admin',
                    'client': client,
                })
            return self._fail(ip, login)

        # 2) Xodim tekshiruvi
        emp = Employee.objects.filter(username=login).first()
        if emp is not None:
            if client == 'web':
                # Xodimlar veb-saytga kira olmaydi — mobil ilovaga yo'naltirish
                record_login_fail(ip, login)
                return Response(
                    {'detail': 'Xodim hisobi veb-saytga kira olmaydi. Mobil ilovadan kiring.', 'code': 'staff_web_denied'},
                    status=status.HTTP_403_FORBIDDEN,
                )
            if emp.status == 'nofaol' or not emp.password:
                return self._fail(ip, login)
            ok, upgrade = verify_password(emp.password, password)
            if ok:
                if upgrade:
                    Employee.objects.filter(pk=emp.pk).update(password=hash_password(password))
                clear_login_fails(ip, login)
                return Response({
                    'role': 'staff',
                    'employee_id': emp.pk,
                    'name': emp.full_name,
                    'position': emp.position,
                    'client': client,
                })
            return self._fail(ip, login)

        # 3) Topilmadi — umumiy xato (enumeration himoyasi)
        return self._fail(ip, login)

    def _fail(self, ip: str, login: str) -> Response:
        from .auth_security import record_login_fail
        left = record_login_fail(ip, login)
        if left <= 0:
            return Response(
                {'detail': 'Juda ko‘p muvaffaqiyatsiz urinish. 15 daqiqadan so‘ng qayta urinib ko‘ring.'},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )
        return Response(
            {'detail': 'Login yoki parol noto‘g‘ri.', 'attempts_left': left},
            status=status.HTTP_401_UNAUTHORIZED,
        )


class DeliveryTripViewSet(viewsets.ModelViewSet):
    queryset = DeliveryTrip.objects.all()
    serializer_class = DeliveryTripSerializer
    search_fields = ['trip_code', 'driver_name', 'client_name', 'order_number', 'waybill_ttn_number', 'status']
    ordering_fields = ['created_at', 'delivery_fee', 'id']

    def _validate_status_transition(self, trip, new_status):
        # QOTISH QOIDASI: «Yetkazildi» holatiga o'tgan reysni hech kim o'zgartira olmaydi
        if trip.status == 'yetkazildi':
            return False, 'Bu reys «Yetkazildi» holatida QOTIRILGAN — o‘zgartirib bo‘lmaydi!'
        return True, None

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        # QOTISH QOIDASI: «Yetkazildi» holatidagi reysni hech narsa o'zgartira olmaydi
        if instance.status == 'yetkazildi':
            return Response(
                {'detail': 'Bu reys «Yetkazildi» holatida QOTIRILGAN — o‘zgartirib bo‘lmaydi!'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.status == 'yetkazildi':
            return Response(
                {'detail': 'Bu reys «Yetkazildi» holatida QOTIRILGAN — o‘chirib bo‘lmaydi!'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=['post'], url_path='status')
    def change_status(self, request, pk=None):
        trip = self.get_object()
        new_status = request.data.get('status')
        if not new_status:
            return Response({'detail': 'status maydoni majburiy'}, status=status.HTTP_400_BAD_REQUEST)
        valid, error = self._validate_status_transition(trip, new_status)
        if not valid:
            return Response({'detail': error}, status=status.HTTP_400_BAD_REQUEST)

        trip.status = new_status
        if new_status == 'yetkazildi':
            now = timezone.now()
            trip.completed_time = f"{now.strftime('%H:%M')}, {now.date()}"
        trip.updated_by = request.data.get('updated_by', 'Admin')
        trip.save()
        return Response(self.get_serializer(trip).data)

    @action(detail=False, methods=['get'], url_path='stats')
    def stats(self, request):
        """Kunlik / Oylik / Yillik reyslar soni va yetkazish haqi summasi.
        ?period=day|month|year — bitta davr, parametrsiz — barcha davrlar.
        """
        now = timezone.now()
        today = now.date()
        month_start = today.replace(day=1)
        year_start = today.replace(month=1, day=1)

        def calc(start_date, end_date=None):
            qs = DeliveryTrip.objects.filter(created_at__date__gte=start_date)
            if end_date:
                qs = qs.filter(created_at__date__lte=end_date)
            return {
                'trip_count': qs.count(),
                'total_delivery_fee': qs.aggregate(s=Sum('delivery_fee'))['s'] or 0,
            }

        period = request.query_params.get('period')
        if period == 'day':
            return Response({'day': calc(today)})
        if period == 'month':
            return Response({'month': calc(month_start)})
        if period == 'year':
            return Response({'year': calc(year_start)})
        return Response({
            'day': calc(today),
            'month': calc(month_start),
            'year': calc(year_start),
        })


class DashboardOverviewViewSet(viewsets.ViewSet):
    """Dashboard umumiy ko'rsatkichlari."""

    def list(self, request):
        now = timezone.now()
        today = now.date()
        month_start = today.replace(day=1)
        year_start = today.replace(month=1, day=1)

        def trip_stats(start_date):
            qs = DeliveryTrip.objects.filter(created_at__date__gte=start_date)
            return {
                'trip_count': qs.count(),
                'total_delivery_fee': qs.aggregate(s=Sum('delivery_fee'))['s'] or 0,
            }

        return Response({
            'trips': {
                'day': trip_stats(today),
                'month': trip_stats(month_start),
                'year': trip_stats(year_start),
                'active_now': DeliveryTrip.objects.filter(status='yolda').count(),
                'completed_total': DeliveryTrip.objects.filter(status='yetkazildi').count(),
            },
            'orders': {
                'total': ErpOrder.objects.count(),
                'delivered': ErpOrder.objects.filter(status='yetkazildi').count(),
                'in_progress': ErpOrder.objects.filter(status='jarayonda').count(),
            },
            'waybills': {
                'total': WaybillTTN.objects.count(),
                'delivered': WaybillTTN.objects.filter(status='yetkazildi').count(),
            },
            'clients': {'total': ErpClient.objects.count()},
            'employees': {'total': Employee.objects.count()},
            'products': {'total': ErpProduct.objects.count()},
            'materials': {'total': RawMaterial.objects.count()},
            'payroll': {
                'total': PayrollRecord.objects.count(),
                'paid': PayrollRecord.objects.filter(status='to_langan').count(),
            },
            'bonuses': {
                'total': BonusRecord.objects.count(),
                'approved': BonusRecord.objects.filter(status='tasdiqlangan').count(),
            },
        })


# ---------------------------------------------------------------------------
# Davomat (Attendance) tizimi: geofence + vaqt + Face ID (WebAuthn)
# ---------------------------------------------------------------------------

WEBAUTHN_RP_ID = getattr(settings, 'WEBAUTHN_RP_ID', 'localhost')
WEBAUTHN_ORIGIN = getattr(settings, 'WEBAUTHN_ORIGIN', 'http://localhost:3000')


def haversine_m(lat1, lon1, lat2, lon2):
    """Ikki koordinata orasidagi masofa (metr)."""
    R = 6371000.0
    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)
    a = sin(dlat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon / 2) ** 2
    return 2 * R * asin(sqrt(a))


def _b64url_to_bytes(s):
    s = str(s or '')
    s += '=' * (-len(s) % 4)
    return base64.urlsafe_b64decode(s)


def _b64url_encode(b):
    return base64.urlsafe_b64encode(bytes(b)).rstrip(b'=').decode()


class AttendanceSettingsViewSet(viewsets.ModelViewSet):
    queryset = AttendanceSettings.objects.all()
    serializer_class = AttendanceSettingsSerializer

    @action(detail=False, methods=['get', 'patch'], url_path='current')
    def current(self, request):
        obj = AttendanceSettings.get_solo()
        if request.method == 'PATCH':
            data = dict(request.data) if isinstance(request.data, dict) else {}
            if 'work_days' in data:
                days = sorted({int(x) for x in str(data['work_days']).replace(';', ',').split(',') if str(x).strip().isdigit() and 1 <= int(x) <= 7})
                if not days:
                    return Response({'detail': 'Ish kunlari bo‘sh bo‘lishi mumkin emas (1-7).'}, status=status.HTTP_400_BAD_REQUEST)
                data['work_days'] = ','.join(str(x) for x in days)
            if 'holidays' in data:
                holidays = data['holidays']
                if not isinstance(holidays, list):
                    return Response({'detail': 'Bayram kunlari ro‘yxat ko‘rinishida bo‘lishi kerak.'}, status=status.HTTP_400_BAD_REQUEST)
                for h in holidays:
                    if not isinstance(h, dict) or not h.get('date'):
                        return Response({'detail': 'Har bir bayramda sana (YYYY-MM-DD) bo‘lishi kerak.'}, status=status.HTTP_400_BAD_REQUEST)
                    try:
                        datetime.strptime(h['date'], '%Y-%m-%d')
                    except ValueError:
                        return Response({'detail': f"Sana formati noto‘g‘ri: {h.get('date')}"}, status=status.HTTP_400_BAD_REQUEST)
            ser = self.get_serializer(obj, data=data, partial=True)
            ser.is_valid(raise_exception=True)
            ser.save()
            return Response(ser.data)
        return Response(self.get_serializer(obj).data)


class AttendanceRecordViewSet(viewsets.ModelViewSet):
    queryset = AttendanceRecord.objects.all()
    serializer_class = AttendanceRecordSerializer
    search_fields = ['employee_name', 'date', 'status']
    ordering_fields = ['date', 'id']

    def get_queryset(self):
        qs = super().get_queryset()
        month = self.request.query_params.get('month')  # YYYY-MM
        if month:
            try:
                y, m = month.split('-')
                qs = qs.filter(date__year=int(y), date__month=int(m))
            except (ValueError, AttributeError):
                pass
        year = self.request.query_params.get('year')  # YYYY
        if year:
            try:
                qs = qs.filter(date__year=int(year))
            except (ValueError, AttributeError):
                pass
        employee_id = self.request.query_params.get('employee_id')
        if employee_id:
            qs = qs.filter(employee_id=employee_id)
        return qs

    @action(detail=False, methods=['post'], url_path='check-in')
    def check_in(self, request):
        data = request.data if isinstance(request.data, dict) else {}
        try:
            employee = Employee.objects.get(pk=data.get('employee_id'))
        except (Employee.DoesNotExist, ValueError, TypeError):
            return Response({'detail': 'Xodim topilmadi.'}, status=status.HTTP_400_BAD_REQUEST)
        if employee.status == 'nofaol':
            return Response({'detail': 'Nofaol xodim davomatga kiritilmaydi!'}, status=status.HTTP_400_BAD_REQUEST)
        if data.get('face_verified') is not True:
            return Response({'detail': 'Face ID tasdiqlanmagan — avval yuzni tasdiqlang!'}, status=status.HTTP_400_BAD_REQUEST)

        cfg = AttendanceSettings.get_solo()
        now = timezone.localtime(timezone.now())
        today = now.date()

        # Dam olish / bayram kunlari
        if today.isoweekday() not in cfg.work_days_list():
            return Response({'detail': 'Bugun dam olish kuni — davomat qabul qilinmaydi.'}, status=status.HTTP_400_BAD_REQUEST)
        if today.isoformat() in cfg.holiday_dates():
            return Response({'detail': 'Bugun bayram kuni — davomat qabul qilinmaydi.'}, status=status.HTTP_400_BAD_REQUEST)

        # Ish vaqti (08:00 dan boshlab)
        start = cfg.work_start_time
        if now.time() < start:
            return Response(
                {'detail': f"Ish vaqti hali boshlanmadi — davomat {start.strftime('%H:%M')} dan qabul qilinadi."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        late_limit = (datetime.combine(today, start) + timedelta(minutes=cfg.grace_minutes)).time()
        is_late = now.time() > late_limit

        # Geofence: korxona lokatsiyasi atrofida 25m radius
        company = CompanyInfo.objects.first()
        if not company or company.lat is None or company.lng is None:
            return Response({'detail': 'Korxona lokatsiyasi belgilanmagan — avval xaritada belgilang!'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            clat = float(data.get('lat'))
            clng = float(data.get('lng'))
        except (TypeError, ValueError):
            return Response({'detail': 'Geolokatsiya yuborilmadi — telefon sozlamasini tekshiring!'}, status=status.HTTP_400_BAD_REQUEST)
        dist = haversine_m(company.lat, company.lng, clat, clng)
        if dist > cfg.radius_m:
            return Response(
                {'detail': f"Ish joyidan {int(dist)}m uzoqdasiz (ruxsat: {cfg.radius_m}m radius). Ish joyiga yaqinlashib qayta urining!"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if AttendanceRecord.objects.filter(employee=employee, date=today).exists():
            return Response({'detail': 'Bugungi davomat allaqachon qayd etilgan.'}, status=status.HTTP_400_BAD_REQUEST)

        rec = AttendanceRecord.objects.create(
            employee=employee,
            employee_name=employee.full_name,
            date=today,
            check_in=now.time(),
            lat=clat,
            lng=clng,
            distance_m=round(dist, 1),
            method='face_id',
            face_photo=data.get('face_photo') or '',
            status='kechikkan' if is_late else 'kelgan',
        )
        return Response(self.get_serializer(rec).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'], url_path='mark')
    def mark(self, request):
        """Admin qo'lda tuzatish: kunlik holatni belgilash (kelgan/kechikkan/kelmadi)."""
        data = request.data if isinstance(request.data, dict) else {}
        try:
            employee = Employee.objects.get(pk=data.get('employee_id'))
        except (Employee.DoesNotExist, ValueError, TypeError):
            return Response({'detail': 'Xodim topilmadi.'}, status=status.HTTP_400_BAD_REQUEST)
        if employee.status == 'nofaol':
            return Response({'detail': 'Nofaol xodim davomatga kiritilmaydi!'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            day = datetime.strptime(str(data.get('date')), '%Y-%m-%d').date()
        except (ValueError, TypeError):
            return Response({'detail': 'Sana formati noto‘g‘ri (YYYY-MM-DD).'}, status=status.HTTP_400_BAD_REQUEST)
        if day > timezone.localdate():
            return Response({'detail': 'Kelasi kunni belgilab bo‘lmaydi.'}, status=status.HTTP_400_BAD_REQUEST)
        st = data.get('status')
        if st not in ('kelgan', 'kechikkan', 'kelmadi'):
            return Response({'detail': 'Holat: kelgan / kechikkan / kelmadi.'}, status=status.HTTP_400_BAD_REQUEST)
        if st == 'kelmadi':
            AttendanceRecord.objects.filter(employee=employee, date=day).delete()
            return Response({'deleted': True, 'status': 'kelmadi'})
        cfg = AttendanceSettings.get_solo()
        rec, _ = AttendanceRecord.objects.update_or_create(
            employee=employee, date=day,
            defaults={
                'employee_name': employee.full_name,
                'check_in': cfg.work_start_time,
                'method': 'manual',
                'status': st,
            },
        )
        return Response(self.get_serializer(rec).data)


def _webauthn_challenge_key(kind, emp_id):
    return f'webauthn_challenge_{kind}_{emp_id}'


class SalaryPaymentViewSet(viewsets.ModelViewSet):
    """Oylik to'lov: to'landi -> qotiriladi + moliyaga avtomatik chiqim."""
    queryset = SalaryPayment.objects.all()
    serializer_class = SalaryPaymentSerializer
    search_fields = ['employee_name', 'month', 'status']
    ordering_fields = ['month', 'id']

    def get_queryset(self):
        qs = super().get_queryset()
        month = self.request.query_params.get('month')  # YYYY-MM
        if month:
            qs = qs.filter(month=month)
        return qs

    def _ensure_chiqim(self, payment):
        if payment.status == 'tolandi' and payment.transaction_id is None and (payment.amount or 0) > 0:
            tx = FinancialTransaction.objects.create(
                type='chiqim',
                category='Xodimlar maoshi',
                amount=payment.amount,
                payment_method='bank_transfer',
                date=timezone.localdate(),
                description=f"Oylik maosh to'landi: {payment.employee_name} — {payment.month}",
                related_client=payment.employee_name,
            )
            payment.transaction = tx
            payment.save(update_fields=['transaction'])

    def create(self, request, *args, **kwargs):
        data = request.data if isinstance(request.data, dict) else {}
        try:
            employee = Employee.objects.get(pk=data.get('employee_id'))
        except (Employee.DoesNotExist, ValueError, TypeError):
            return Response({'detail': 'Xodim topilmadi.'}, status=status.HTTP_400_BAD_REQUEST)
        if employee.status == 'nofaol':
            return Response({'detail': 'Nofaol xodimga to‘lov yozib bo‘lmaydi!'}, status=status.HTTP_400_BAD_REQUEST)
        data = {**data, 'employee_name': data.get('employee_name') or employee.full_name}
        ser = self.get_serializer(data=data)
        ser.is_valid(raise_exception=True)
        payment = ser.save()
        self._ensure_chiqim(payment)
        return Response(self.get_serializer(payment).data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        inst = self.get_object()
        if inst.status == 'tolandi':
            return Response(
                {'detail': 'Bu to‘lov «To‘landi» holatida QOTIRILGAN — o‘zgartirib bo‘lmaydi!'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        partial = kwargs.get('partial', True)
        ser = self.get_serializer(inst, data=request.data, partial=partial)
        ser.is_valid(raise_exception=True)
        payment = ser.save()
        self._ensure_chiqim(payment)
        return Response(self.get_serializer(payment).data)

    def destroy(self, request, *args, **kwargs):
        inst = self.get_object()
        if inst.status == 'tolandi':
            return Response(
                {'detail': 'Bu to‘lov «To‘landi» holatida QOTIRILGAN — o‘chirib bo‘lmaydi!'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().destroy(request, *args, **kwargs)
