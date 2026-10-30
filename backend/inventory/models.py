from django.db import models

class Item(models.Model):
    name = models.CharField(max_length=200)
    sku = models.CharField(max_length=50, unique=True)
    category = models.CharField(max_length=100, default='Uncategorized')
    location = models.CharField(max_length=100, default='Unassigned')
    quantity = models.IntegerField(default=0)
    reorder_point = models.IntegerField(default=10)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    supplier = models.CharField(max_length=200)
    last_updated = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.sku} - {self.name}"
