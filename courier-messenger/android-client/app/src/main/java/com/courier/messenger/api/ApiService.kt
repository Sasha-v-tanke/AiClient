package com.courier.messenger.api

import com.courier.messenger.models.*
import retrofit2.Response
import retrofit2.http.*

interface ApiService {

    // === Auth ===
    @POST("api/auth/login")
    suspend fun login(@Body request: LoginRequest): Response<AuthResponse>

    @POST("api/auth/register")
    suspend fun register(@Body request: RegisterRequest): Response<AuthResponse>

    @GET("api/auth/me")
    suspend fun getMe(): Response<MeResponse>

    @POST("api/auth/logout")
    suspend fun logout(): Response<AuthResponse>

    // === Chats ===
    @GET("api/chats")
    suspend fun getChats(): Response<ChatListResponse>

    @GET("api/chats/{chatId}")
    suspend fun getChat(@Path("chatId") chatId: String): Response<ChatListResponse>

    // === Messages ===
    @GET("api/messages/{chatId}")
    suspend fun getMessages(
        @Path("chatId") chatId: String,
        @Query("page") page: Int = 1
    ): Response<MessageListResponse>

    @POST("api/messages/{chatId}")
    suspend fun sendMessage(
        @Path("chatId") chatId: String,
        @Body request: SendMessageRequest
    ): Response<MessageResponse>

    // === Orders ===
    @GET("api/orders")
    suspend fun getOrders(
        @Query("status") status: String? = null
    ): Response<OrderListResponse>

    @POST("api/orders")
    suspend fun createOrder(@Body order: Map<String, Any>): Response<OrderResponse>

    @PUT("api/orders/{orderId}/status")
    suspend fun updateOrderStatus(
        @Path("orderId") orderId: String,
        @Body request: StatusUpdateRequest
    ): Response<OrderActionResponse>

    @PUT("api/orders/{orderId}/assign")
    suspend fun assignCourier(
        @Path("orderId") orderId: String,
        @Body body: Map<String, String>
    ): Response<OrderActionResponse>
}
