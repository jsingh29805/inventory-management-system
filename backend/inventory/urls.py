from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import ProductViewSet, dashboard

router = DefaultRouter()
router.register('products', ProductViewSet)

urlpatterns = [
    path('dashboard/', dashboard),
]

urlpatterns += router.urls