package com.courier.messenger.repository

import com.courier.messenger.api.RetrofitClient
import com.courier.messenger.models.*

class ChatRepository {

    private val api = RetrofitClient.getApiService()

    suspend fun getChats(): Result<List<Chat>> {
        return try {
            val response = api.getChats()
            if (response.isSuccessful && response.body()?.success == true) {
                Result.success(response.body()!!.data)
            } else {
                Result.failure(Exception("Ошибка загрузки чатов"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getMessages(chatId: String, page: Int = 1): Result<List<Message>> {
        return try {
            val response = api.getMessages(chatId, page)
            if (response.isSuccessful && response.body()?.success == true) {
                Result.success(response.body()!!.data)
            } else {
                Result.failure(Exception("Ошибка загрузки сообщений"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun sendMessage(chatId: String, content: String, type: String = "text"): Result<Message> {
        return try {
            val response = api.sendMessage(chatId, SendMessageRequest(content, type))
            if (response.isSuccessful && response.body()?.success == true) {
                Result.success(response.body()!!.data)
            } else {
                Result.failure(Exception("Ошибка отправки сообщения"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
