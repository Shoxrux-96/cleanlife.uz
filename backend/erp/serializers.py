from rest_framework import serializers

from .models import (
    AttendanceRecord, AttendanceSettings, BomItem, BonusRecord, CompanyInfo, ContactMessage, DeliveryTrip, Employee, ErpClient, ErpOrder,
    ErpOrderItem, ErpProduct, FinancialTransaction, PayrollRecord, SalaryPayment,
    RawMaterial, SiteBeforeAfter, SiteContactInfo, SitePortfolioProject, WaybillItem, WaybillTTN,
)


class BomItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = BomItem
        fields = ['id', 'material_id', 'material_name', 'quantity_needed', 'unit', 'unit_cost', 'total_cost']

    material_id = serializers.PrimaryKeyRelatedField(
        source='material', queryset=RawMaterial.objects.all(), allow_null=True, required=False
    )


class ErpProductSerializer(serializers.ModelSerializer):
    bom = BomItemSerializer(many=True, required=False)

    class Meta:
        model = ErpProduct
        fields = [
            'id', 'name', 'image_url', 'category', 'sku', 'base_cost', 'branding_cost',
            'packaging_cost', 'labor_cost', 'selling_price', 'min_order', 'stock_count',
            'sold_count', 'technique', 'specification', 'ready_date', 'batch_number',
            'bom', 'created_at',
        ]

    def create(self, validated_data):
        bom_data = validated_data.pop('bom', [])
        product = ErpProduct.objects.create(**validated_data)
        for item in bom_data:
            BomItem.objects.create(product=product, **item)
        return product

    def update(self, instance, validated_data):
        bom_data = validated_data.pop('bom', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if bom_data is not None:
            instance.bom.all().delete()
            for item in bom_data:
                BomItem.objects.create(product=instance, **item)
        return instance


class RawMaterialSerializer(serializers.ModelSerializer):
    class Meta:
        model = RawMaterial
        fields = [
            'id', 'name', 'batch_number', 'category', 'unit', 'quantity',
            'min_threshold', 'unit_cost', 'supplier', 'counterparty',
            'payment_method', 'last_restocked', 'storage_location', 'status', 'created_at',
        ]


class ErpOrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = ErpOrderItem
        fields = ['id', 'product_id', 'product_name', 'quantity', 'unit_price', 'total_price']

    product_id = serializers.PrimaryKeyRelatedField(
        source='product', queryset=ErpProduct.objects.all(), allow_null=True, required=False
    )


class ErpOrderSerializer(serializers.ModelSerializer):
    items = ErpOrderItemSerializer(many=True, required=False)

    class Meta:
        model = ErpOrder
        fields = [
            'id', 'order_number', 'company', 'client_name', 'phone', 'business_type',
            'product_name', 'items', 'quantity', 'total_amount', 'paid_amount',
            'estimated_cost', 'status', 'order_date', 'delivery_date', 'technique',
            'notes', 'ttn_number', 'delivered_quantity', 'created_at',
        ]

    def create(self, validated_data):
        items_data = validated_data.pop('items', [])
        order = ErpOrder.objects.create(**validated_data)
        for item in items_data:
            ErpOrderItem.objects.create(order=order, **item)
        return order

    def update(self, instance, validated_data):
        items_data = validated_data.pop('items', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if items_data is not None:
            instance.items.all().delete()
            for item in items_data:
                ErpOrderItem.objects.create(order=instance, **item)
        return instance


class ErpClientSerializer(serializers.ModelSerializer):
    class Meta:
        model = ErpClient
        fields = [
            'id', 'name', 'company', 'type', 'phone', 'email', 'source',
            'employee_name', 'region', 'district', 'address', 'location',
            'total_orders', 'total_spent', 'last_order_date', 'status', 'created_at',
        ]


class EmployeeSerializer(serializers.ModelSerializer):
    has_face_id = serializers.SerializerMethodField()
    password = serializers.CharField(write_only=True, required=False, allow_blank=True, max_length=255)

    class Meta:
        model = Employee
        fields = [
            'id', 'full_name', 'position', 'phone', 'status',
            'salary', 'join_date', 'avatar_color', 'avatar',
            'username', 'password', 'has_face_id', 'created_at',
        ]

    def get_has_face_id(self, obj):
        return bool(obj.webauthn_credential)

    def validate_password(self, value):
        from .auth_security import hash_password, is_password_hashed
        if not value:
            # Bo'sh parol yuborilsa — eski parol saqlanib qoladi
            raise serializers.SkipField()
        if not is_password_hashed(value):
            return hash_password(value)
        return value


class PayrollRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = PayrollRecord
        fields = [
            'id', 'employee_id', 'employee_name', 'position', 'department',
            'month', 'base_salary', 'bonus_amount', 'deductions', 'net_salary',
            'status', 'payment_date', 'created_at',
        ]

    employee_id = serializers.PrimaryKeyRelatedField(
        source='employee', queryset=Employee.objects.all(), allow_null=True, required=False
    )


class BonusRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = BonusRecord
        fields = [
            'id', 'employee_id', 'employee_name', 'kpi_type', 'amount',
            'date', 'status', 'notes', 'created_at',
        ]

    employee_id = serializers.PrimaryKeyRelatedField(
        source='employee', queryset=Employee.objects.all(), allow_null=True, required=False
    )


class WaybillItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = WaybillItem
        fields = ['id', 'name', 'format', 'unit', 'quantity', 'unit_price', 'total_price']


class WaybillTTNSerializer(serializers.ModelSerializer):
    items = WaybillItemSerializer(many=True, required=False)

    class Meta:
        model = WaybillTTN
        fields = [
            'id', 'order_id', 'order_number', 'custom_order_id', 'ttn_number',
            'category', 'sender_company', 'sender_phone', 'sender_address',
            'receiver_company', 'receiver_phone', 'receiver_address',
            'driver_name', 'driver_license', 'vehicle_plate', 'vehicle_model',
            'items', 'total_sum', 'issue_date', 'issue_time', 'status',
            'route_from', 'route_to', 'responsible_shipper', 'seal_number', 'created_at',
        ]

    order_id = serializers.PrimaryKeyRelatedField(
        source='order', queryset=ErpOrder.objects.all(), allow_null=True, required=False
    )

    def create(self, validated_data):
        items_data = validated_data.pop('items', [])
        waybill = WaybillTTN.objects.create(**validated_data)
        for item in items_data:
            WaybillItem.objects.create(waybill=waybill, **item)
        return waybill

    def update(self, instance, validated_data):
        items_data = validated_data.pop('items', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if items_data is not None:
            instance.items.all().delete()
            for item in items_data:
                WaybillItem.objects.create(waybill=instance, **item)
        return instance


class DeliveryTripSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeliveryTrip
        fields = [
            'id', 'trip_code', 'driver_name', 'driver_phone', 'vehicle_model',
            'vehicle_plate', 'destination_address', 'client_name', 'order_number',
            'cargo_summary', 'status', 'departure_time', 'estimated_arrival',
            'completed_time', 'lat', 'lng', 'waybill_id', 'waybill_ttn_number',
            'delivery_fee', 'created_at', 'updated_by',
        ]

    waybill_id = serializers.PrimaryKeyRelatedField(
        source='waybill', queryset=WaybillTTN.objects.all(), allow_null=True, required=False
    )


class FinancialTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = FinancialTransaction
        fields = [
            'id', 'type', 'category', 'amount', 'payment_method', 'date',
            'description', 'related_client', 'related_order_id', 'created_at',
        ]

    related_order_id = serializers.PrimaryKeyRelatedField(
        source='related_order', queryset=ErpOrder.objects.all(), allow_null=True, required=False
    )


class CompanyInfoSerializer(serializers.ModelSerializer):
    admin_password = serializers.CharField(write_only=True, required=False, allow_blank=True, max_length=255)

    class Meta:
        model = CompanyInfo
        fields = [
            'id', 'name', 'slogan', 'logo', 'location', 'address',
            'owner', 'manager', 'phone', 'phone2', 'email',
            'admin_name', 'admin_login', 'admin_password',
            'admin_title', 'admin_position', 'admin_role',
            'admin_phone', 'lat', 'lng',
            'created_at', 'updated_at'
        ]

    def validate_admin_password(self, value):
        from .auth_security import hash_password, is_password_hashed
        if not value:
            raise serializers.SkipField()
        if not is_password_hashed(value):
            return hash_password(value)
        return value


class AttendanceSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = AttendanceSettings
        fields = [
            'id', 'work_start_time', 'work_end_time', 'grace_minutes', 'radius_m',
            'work_days', 'holidays', 'updated_at',
        ]


class AttendanceRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = AttendanceRecord
        fields = [
            'id', 'employee_id', 'employee_name', 'date', 'check_in',
            'lat', 'lng', 'distance_m', 'method', 'face_photo',
            'status', 'created_at',
        ]

    employee_id = serializers.PrimaryKeyRelatedField(
        source='employee', queryset=Employee.objects.all()
    )


class SalaryPaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = SalaryPayment
        fields = [
            'id', 'employee_id', 'employee_name', 'month', 'amount',
            'status', 'transaction_id', 'created_at', 'updated_at',
        ]
        read_only_fields = ['transaction_id']

    employee_id = serializers.PrimaryKeyRelatedField(
        source='employee', queryset=Employee.objects.all()
    )
    transaction_id = serializers.PrimaryKeyRelatedField(
        source='transaction', read_only=True
    )


class ContactMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContactMessage
        fields = ['id', 'name', 'phone', 'email', 'message', 'status', 'external_id', 'created_at']


class SiteContactInfoSerializer(serializers.ModelSerializer):
    class Meta:
        model = SiteContactInfo
        fields = [
            'id', 'phone1', 'phone2', 'phone3', 'email', 'telegram', 'instagram',
            'address', 'address_ru', 'working_hours', 'working_hours_ru',
            'updated_at',
        ]


class SitePortfolioProjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = SitePortfolioProject
        fields = [
            'id', 'external_id', 'lang', 'business_type',
            'is_published', 'published_at', 'data', 'updated_at',
        ]


class SiteBeforeAfterSerializer(serializers.ModelSerializer):
    class Meta:
        model = SiteBeforeAfter
        fields = ['id', 'lang', 'data', 'updated_at']
