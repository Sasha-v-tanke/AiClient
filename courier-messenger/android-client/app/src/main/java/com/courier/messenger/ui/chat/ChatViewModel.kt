package com.courier.messenger.ui.chat

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.courier.messenger.models.Chat
import com.courier.messenger.models.Message
import com.courier.messenger.repository.ChatRepository
import com.courier.messenger.socket.SocketManager
import kotlinx.coroutines.launch
import org.json.JSONObject

class ChatViewModel : ViewModel() {

    private val repository = ChatRepository()

    private val _chats = MutableLiveData<List<Chat>>(emptyList())
    val chats: LiveData<List<Chat>> = _chats

    private val _messages = MutableLiveData<List<Message>>(emptyList())
    val messages: LiveData<List<Message>> = _messages

    private val _error = MutableLiveData<String?>()
    val error: LiveData<String?> = _error

    private val _loading = MutableLiveData<Boolean>()
    val loading: LiveData<Boolean> = _loading

    private var currentChatId: String? = null

    private val newMessageListener: (Any) -> Unit = { data ->
        try {
            val json = data as? JSONObject ?: return@it
            val chatId = json.optString("chat")
            if (chatId == currentChatId) {
                // Add to messages
                val currentMessages = _messages.value?.toMutableList() ?: mutableListOf()
                // Note: proper parsing would be done here
                _messages.postValue(currentMessages)
            }
            // Refresh chats to update last message
            loadChats()
        } catch (e: Exception) {
            // ignore parse errors
        }
    }

    init {
        SocketManager.addEventListener("new_message", newMessageListener)
    }

    fun loadChats() {
        viewModelScope.launch {
            _loading.value = true
            val result = repository.getChats()
            result.onSuccess { _chats.value = it }
            result.onFailure { _error.value = it.message }
            _loading.value = false
        }
    }

    fun loadMessages(chatId: String) {
        currentChatId = chatId
        SocketManager.joinChat(chatId)
        viewModelScope.launch {
            _loading.value = true
            val result = repository.getMessages(chatId)
            result.onSuccess { _messages.value = it }
            result.onFailure { _error.value = it.message }
            _loading.value = false
        }
    }

    fun sendMessage(chatId: String, content: String) {
        viewModelScope.launch {
            val result = repository.sendMessage(chatId, content)
            result.onFailure { _error.value = it.message }
        }
    }

    fun leaveChat() {
        currentChatId?.let { SocketManager.leaveChat(it) }
        currentChatId = null
    }

    fun sendTyping(chatId: String) {
        SocketManager.sendTyping(chatId)
    }

    fun sendStopTyping(chatId: String) {
        SocketManager.sendStopTyping(chatId)
    }

    override fun onCleared() {
        super.onCleared()
        SocketManager.removeEventListener("new_message", newMessageListener)
        leaveChat()
    }
}
