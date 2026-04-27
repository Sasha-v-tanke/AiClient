package com.courier.messenger.models

data class Message(
    val _id: String,
    val chat: String,
    val sender: User? = null,
    val content: String,
    val messageType: String = "text",
    val timestamp: String,
    val readBy: List<ReadReceipt>? = null
)

data class ReadReceipt(
    val user: String,
    val readAt: String
)

data class MessageListResponse(
    val success: Boolean,
    val data: List<Message>,
    val pagination: Pagination? = null
)

data class Pagination(
    val page: Int,
    val limit: Int,
    val total: Int,
    val pages: Int
)

data class SendMessageRequest(
    val content: String,
    val messageType: String = "text"
)

data class MessageResponse(
    val success: Boolean,
    val data: Message
)
