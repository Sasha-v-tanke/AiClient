package com.courier.messenger.models

import com.google.gson.JsonDeserializationContext
import com.google.gson.JsonDeserializer
import com.google.gson.JsonElement
import com.google.gson.annotations.JsonAdapter
import java.lang.reflect.Type

data class Chat(
    val _id: String,
    val participants: List<User>,
    val type: String,
    val name: String? = null,
    @JsonAdapter(OrderRefDeserializer::class)
    val orderRef: OrderRef? = null,
    val lastMessage: Message? = null,
    val updatedAt: String? = null
)

data class OrderRef(
    val _id: String,
    val orderNumber: String? = null,
    val status: String? = null
)

class OrderRefDeserializer : JsonDeserializer<OrderRef?> {
    override fun deserialize(json: JsonElement, typeOfT: Type, context: JsonDeserializationContext): OrderRef? {
        return if (json.isJsonObject) {
            context.deserialize(json, OrderRef::class.java)
        } else if (json.isJsonPrimitive && json.asJsonPrimitive.isString) {
            OrderRef(_id = json.asString)
        } else {
            null
        }
    }
}

data class ChatListResponse(
    val success: Boolean,
    val data: List<Chat>
)
