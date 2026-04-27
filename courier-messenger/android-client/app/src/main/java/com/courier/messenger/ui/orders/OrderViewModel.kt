package com.courier.messenger.ui.orders

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.courier.messenger.models.Order
import com.courier.messenger.repository.OrderRepository
import com.courier.messenger.socket.SocketManager
import kotlinx.coroutines.launch

class OrderViewModel : ViewModel() {

    private val repository = OrderRepository()

    private val _orders = MutableLiveData<List<Order>>(emptyList())
    val orders: LiveData<List<Order>> = _orders

    private val _error = MutableLiveData<String?>()
    val error: LiveData<String?> = _error

    private val _loading = MutableLiveData<Boolean>()
    val loading: LiveData<Boolean> = _loading

    private val _statusUpdated = MutableLiveData<Boolean>()
    val statusUpdated: LiveData<Boolean> = _statusUpdated

    private val orderUpdateListener: (Any) -> Unit = {
        loadOrders()
    }

    init {
        SocketManager.addEventListener("order_assigned", orderUpdateListener)
        SocketManager.addEventListener("status_update", orderUpdateListener)
    }

    fun loadOrders(status: String? = null) {
        viewModelScope.launch {
            _loading.value = true
            val result = repository.getOrders(status)
            result.onSuccess { _orders.value = it }
            result.onFailure { _error.value = it.message }
            _loading.value = false
        }
    }

    fun updateStatus(orderId: String, newStatus: String, note: String? = null) {
        viewModelScope.launch {
            _loading.value = true
            val result = repository.updateStatus(orderId, newStatus, note)
            result.onSuccess {
                _statusUpdated.value = true
                loadOrders()
            }
            result.onFailure { _error.value = it.message }
            _loading.value = false
        }
    }

    override fun onCleared() {
        super.onCleared()
        SocketManager.removeEventListener("order_assigned", orderUpdateListener)
        SocketManager.removeEventListener("status_update", orderUpdateListener)
    }
}
