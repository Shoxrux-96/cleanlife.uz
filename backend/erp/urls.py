from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    AttendanceRecordViewSet, AttendanceSettingsViewSet, AuthViewSet,
    BonusRecordViewSet, CompanyInfoViewSet, ContactMessageViewSet, DashboardOverviewViewSet, DeliveryTripViewSet,
    EmployeeViewSet, ErpClientViewSet, ErpOrderViewSet, ErpProductViewSet,
    FinancialTransactionViewSet, PayrollRecordViewSet, SalaryPaymentViewSet, RawMaterialViewSet,
    SiteBeforeAfterViewSet, SiteContactInfoViewSet, SitePortfolioProjectViewSet,
    WaybillTTNViewSet,
)

router = DefaultRouter()
router.register(r'transactions', FinancialTransactionViewSet, basename='transaction')
router.register(r'materials', RawMaterialViewSet, basename='material')
router.register(r'products', ErpProductViewSet, basename='product')
router.register(r'orders', ErpOrderViewSet, basename='order')
router.register(r'clients', ErpClientViewSet, basename='client')
router.register(r'employees', EmployeeViewSet, basename='employee')
router.register(r'payroll', PayrollRecordViewSet, basename='payroll')
router.register(r'bonuses', BonusRecordViewSet, basename='bonus')
router.register(r'waybills', WaybillTTNViewSet, basename='waybill')
router.register(r'deliveries', DeliveryTripViewSet, basename='delivery')
router.register(r'company', CompanyInfoViewSet, basename='company')
router.register(r'contact-messages', ContactMessageViewSet, basename='contact-message')
router.register(r'site/contact-info', SiteContactInfoViewSet, basename='site-contact-info')
router.register(r'site/portfolio', SitePortfolioProjectViewSet, basename='site-portfolio')
router.register(r'site/slider', SiteBeforeAfterViewSet, basename='site-slider')
router.register(r'auth', AuthViewSet, basename='auth')
router.register(r'attendance', AttendanceRecordViewSet, basename='attendance')
router.register(r'attendance-settings', AttendanceSettingsViewSet, basename='attendance-settings')
router.register(r'salary-payments', SalaryPaymentViewSet, basename='salary-payment')
router.register(r'stats/overview', DashboardOverviewViewSet, basename='stats-overview')

urlpatterns = [
    path('', include(router.urls)),
]
