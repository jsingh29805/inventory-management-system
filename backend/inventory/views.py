from rest_framework import viewsets
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .models import Product
from .serializers import ProductSerializer


class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer


@api_view(['GET'])
def dashboard(request):
    products = Product.objects.all()

    total_products = products.count()

    total_value = 0
    low_stock = 0

    for p in products:
        total_value += p.quantity * float(p.price)

        if p.quantity < 5:
            low_stock += 1

    return Response({
        "total_products": total_products,
        "total_value": total_value,
        "low_stock": low_stock
    })