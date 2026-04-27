package com.courier.messenger.models

data class Chat(
    val _id: String,
    val participants: List<User>,
    val type: String,
    val name: String? = null,
    val orderRef: OrderRef? = null,
    val lastMessage: Message? = null,
    val updatedAt: String? = null
)

data class OrderRef(
    val _id: String,
    val orderNumber: String,
    val status: String
)

data class ChatListResponse(
    val success: Boolean,
    val data: List<Chat>
)
