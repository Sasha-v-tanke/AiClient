package com.courier.messenger.repository

import com.courier.messenger.api.RetrofitClient
import com.courier.messenger.models.*

class OrderRepository {

    private val api = RetrofitClient.getApiService()

    suspend fun getOrders(status: String? = null): Result<List<Order>> {
        return try {
            val response = api.getOrders(status)
            if (response.isSuccessful && response.body()?.success == true) {
                Result.success(response.body()!!.data)
            } else {
                Result.failure(Exception("Ошибка загрузки заказов"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun updateStatus(orderId: String, newStatus: String, note: String? = null): Result<Boolean> {
        return try {
            val response = api.updateOrderStatus(
                orderId,
                StatusUpdateRequest(newStatus, note)
            )
            if (response.isSuccessful) {
                Result.success(true)
            } else {
                val errorBody = response.errorBody()?.string()
                Result.failure(Exception(errorBody ?: "Ошибка обновления статуса"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun assignCourier(orderId: String, courierId: String): Result<Boolean> {
        return try {
            val response = api.assignCourier(orderId, mapOf("courierId" to courierId))
            if (response.isSuccessful) {
                Result.success(true)
            } else {
                Result.failure(Exception("Ошибка назначения курьера"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
