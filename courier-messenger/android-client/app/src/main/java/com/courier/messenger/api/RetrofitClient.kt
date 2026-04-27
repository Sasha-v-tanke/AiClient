package com.courier.messenger.api

import android.content.Context
import com.courier.messenger.BuildConfig
import okhttp3.Interceptor
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

object RetrofitClient {

    private var token: String? = null
    private var retrofit: Retrofit? = null

    fun setToken(newToken: String?) {
        token = newToken
        retrofit = null // Force rebuild
    }

    fun getToken(): String? = token

    private fun getAuthInterceptor(): Interceptor {
        return Interceptor { chain ->
            val originalRequest = chain.request()
            val builder = originalRequest.newBuilder()

            token?.let {
                builder.addHeader("Authorization", "Bearer $it")
            }

            chain.proceed(builder.build())
        }
    }

    fun getApiService(): ApiService {
        if (retrofit == null) {
            val logging = HttpLoggingInterceptor().apply {
                level = HttpLoggingInterceptor.Level.BODY
            }

            val client = OkHttpClient.Builder()
                .addInterceptor(getAuthInterceptor())
                .addInterceptor(logging)
                .connectTimeout(30, TimeUnit.SECONDS)
                .readTimeout(30, TimeUnit.SECONDS)
                .writeTimeout(30, TimeUnit.SECONDS)
                .build()

            retrofit = Retrofit.Builder()
                .baseUrl(BuildConfig.BASE_URL)
                .client(client)
                .addConverterFactory(GsonConverterFactory.create())
                .build()
        }

        return retrofit!!.create(ApiService::class.java)
    }

    // Хранение токена в SharedPreferences
    fun saveToken(context: Context, token: String) {
        val prefs = context.getSharedPreferences("courier_prefs", Context.MODE_PRIVATE)
        prefs.edit().putString("auth_token", token).apply()
        setToken(token)
    }

    fun loadToken(context: Context): String? {
        val prefs = context.getSharedPreferences("courier_prefs", Context.MODE_PRIVATE)
        val savedToken = prefs.getString("auth_token", null)
        savedToken?.let { setToken(it) }
        return savedToken
    }

    fun clearToken(context: Context) {
        val prefs = context.getSharedPreferences("courier_prefs", Context.MODE_PRIVATE)
        prefs.edit().remove("auth_token").remove("user_data").apply()
        setToken(null)
    }

    fun saveUser(context: Context, userJson: String) {
        val prefs = context.getSharedPreferences("courier_prefs", Context.MODE_PRIVATE)
        prefs.edit().putString("user_data", userJson).apply()
    }

    fun loadUser(context: Context): String? {
        val prefs = context.getSharedPreferences("courier_prefs", Context.MODE_PRIVATE)
        return prefs.getString("user_data", null)
    }
}
