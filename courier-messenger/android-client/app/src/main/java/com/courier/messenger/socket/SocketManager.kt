package com.courier.messenger.socket

import android.util.Log
import com.courier.messenger.api.RetrofitClient
import io.socket.client.IO
import io.socket.client.Socket
import io.socket.emitter.Emitter
import org.json.JSONObject
import java.net.URI

object SocketManager {

    private const val TAG = "SocketManager"
    private const val SERVER_URL = "http://10.0.2.2:5000"

    private var socket: Socket? = null
    private val listeners = mutableMapOf<String, MutableList<(Any) -> Unit>>()

    fun connect() {
        try {
            val token = RetrofitClient.getToken() ?: return

            val options = IO.Options().apply {
                auth = mapOf("token" to token)
                transports = arrayOf("websocket", "polling")
                reconnection = true
                reconnectionAttempts = 10
                reconnectionDelay = 1000
                timeout = 10000
            }

            socket = IO.socket(URI.create(SERVER_URL), options)

            socket?.on(Socket.EVENT_CONNECT) {
                Log.d(TAG, "✅ Socket подключён")
            }

            socket?.on(Socket.EVENT_DISCONNECT) {
                Log.d(TAG, "❌ Socket отключён")
            }

            socket?.on(Socket.EVENT_CONNECT_ERROR) { args ->
                Log.e(TAG, "Socket ошибка: ${args.firstOrNull()}")
            }

            // Обработка входящих сообщений
            socket?.on("new_message") { args ->
                args.firstOrNull()?.let { data ->
                    Log.d(TAG, "📩 Новое сообщение: $data")
                    notifyListeners("new_message", data)
                }
            }

            // Статус пользователя
            socket?.on("user_online") { args ->
                notifyListeners("user_online", args.firstOrNull() ?: return@on)
            }

            socket?.on("user_offline") { args ->
                notifyListeners("user_offline", args.firstOrNull() ?: return@on)
            }

            // Индикатор печати
            socket?.on("user_typing") { args ->
                notifyListeners("user_typing", args.firstOrNull() ?: return@on)
            }

            socket?.on("user_stop_typing") { args ->
                notifyListeners("user_stop_typing", args.firstOrNull() ?: return@on)
            }

            // Обновления заказов
            socket?.on("order_assigned") { args ->
                notifyListeners("order_assigned", args.firstOrNull() ?: return@on)
            }

            socket?.on("status_update") { args ->
                notifyListeners("status_update", args.firstOrNull() ?: return@on)
            }

            // Локация курьера
            socket?.on("courier_location_update") { args ->
                notifyListeners("courier_location_update", args.firstOrNull() ?: return@on)
            }

            socket?.connect()

        } catch (e: Exception) {
            Log.e(TAG, "Ошибка подключения Socket: ${e.message}")
        }
    }

    fun disconnect() {
        socket?.disconnect()
        socket?.off()
        socket = null
        listeners.clear()
    }

    fun joinChat(chatId: String) {
        socket?.emit("join_chat", chatId)
        Log.d(TAG, "Вошёл в чат: $chatId")
    }

    fun leaveChat(chatId: String) {
        socket?.emit("leave_chat", chatId)
    }

    fun sendTyping(chatId: String) {
        val data = JSONObject().put("chatId", chatId)
        socket?.emit("typing", data)
    }

    fun sendStopTyping(chatId: String) {
        val data = JSONObject().put("chatId", chatId)
        socket?.emit("stop_typing", data)
    }

    fun updateLocation(lat: Double, lng: Double) {
        val data = JSONObject().apply {
            put("lat", lat)
            put("lng", lng)
        }
        socket?.emit("update_location", data)
    }

    // Система подписок
    fun addEventListener(event: String, listener: (Any) -> Unit) {
        listeners.getOrPut(event) { mutableListOf() }.add(listener)
    }

    fun removeEventListener(event: String, listener: (Any) -> Unit) {
        listeners[event]?.remove(listener)
    }

    fun removeAllListeners(event: String) {
        listeners.remove(event)
    }

    private fun notifyListeners(event: String, data: Any) {
        listeners[event]?.forEach { listener ->
            try {
                listener(data)
            } catch (e: Exception) {
                Log.e(TAG, "Ошибка в listener: ${e.message}")
            }
        }
    }

    fun isConnected(): Boolean = socket?.connected() == true
}
