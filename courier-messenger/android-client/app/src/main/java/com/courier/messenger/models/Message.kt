package com.courier.messenger.models

import com.google.gson.JsonDeserializationContext
import com.google.gson.JsonDeserializer
import com.google.gson.JsonElement
import com.google.gson.annotations.JsonAdapter
import java.lang.reflect.Type

data class Message(
    val _id: String,
    val chat: String,
    @JsonAdapter(UserDeserializer::class)
    val sender: User? = null,
    val content: String,
    val messageType: String = "text",
    val timestamp: String,
    val readBy: List<ReadReceipt>? = null
)

class UserDeserializer : JsonDeserializer<User?> {
    override fun deserialize(json: JsonElement, typeOfT: Type, context: JsonDeserializationContext): User? {
        return if (json.isJsonObject) {
            context.deserialize(json, User::class.java)
        } else if (json.isJsonPrimitive && json.asJsonPrimitive.isString) {
            // Если пришел только ID, создаем объект заглушку (или можно оставить null)
            User(_id = json.asString, username = "...", email = "", role = "", phone = "")
        } else {
            null
        }
    }
}

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
