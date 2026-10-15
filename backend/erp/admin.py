from django.contrib import admin

from .models import (
    BomItem, BonusRecord, ContactMessage, DeliveryTrip, Employee, ErpClient, ErpOrder,
    ErpOrderItem, ErpProduct, FinancialTransaction, PayrollRecord,
    RawMaterial, SiteBeforeAfter, SiteContactInfo, SitePortfolioProject,
    WaybillItem, WaybillTTN,
)

admin.site.register(FinancialTransaction)
admin.site.register(RawMaterial)
admin.site.register(ErpProduct)
admin.site.register(BomItem)
admin.site.register(ErpOrder)
admin.site.register(ErpOrderItem)
admin.site.register(ErpClient)
admin.site.register(Employee)
admin.site.register(PayrollRecord)
admin.site.register(BonusRecord)
admin.site.register(WaybillTTN)
admin.site.register(WaybillItem)
admin.site.register(DeliveryTrip)
admin.site.register(ContactMessage)
admin.site.register(SiteContactInfo)
admin.site.register(SitePortfolioProject)
admin.site.register(SiteBeforeAfter)
