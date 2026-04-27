package com.courier.messenger.models

data class Order(
    val _id: String,
    val orderNumber: String,
    val customer: Customer,
    val courier: User? = null,
    val dispatcher: User? = null,
    val pickupAddress: String,
    val deliveryAddress: String,
    val status: String,
    val items: List<OrderItem>? = null,
    val priority: String = "normal",
    val createdAt: String? = null
)

data class Customer(
    val name: String,
    val phone: String,
    val address: String
)

data class OrderItem(
    val name: String,
    val quantity: Int = 1,
    val weight: Double? = null
)

data class OrderListResponse(
    val success: Boolean,
    val data: List<Order>
)

data class StatusUpdateRequest(
    val newStatus: String,
    val note: String? = null
)
