package com.courier.messenger.models

data class User(
    val _id: String,
    val username: String,
    val email: String,
    val role: String,
    val phone: String,
    val isOnline: Boolean = false,
    val lastSeen: String? = null,
    val avatar: String? = null
)

data class AuthResponse(
    val success: Boolean,
    val data: AuthData? = null,
    val message: String? = null
)

data class MeResponse(
    val success: Boolean,
    val data: User? = null,
    val message: String? = null
)

data class AuthData(
    val user: User,
    val token: String
)

data class LoginRequest(
    val email: String,
    val password: String
)

data class RegisterRequest(
    val username: String,
    val email: String,
    val password: String,
    val phone: String,
    val role: String
)
