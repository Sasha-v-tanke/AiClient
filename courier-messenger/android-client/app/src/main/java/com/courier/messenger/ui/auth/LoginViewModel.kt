package com.courier.messenger.ui.auth

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.courier.messenger.api.RetrofitClient
import com.courier.messenger.models.LoginRequest
import com.courier.messenger.models.User
import kotlinx.coroutines.launch

class LoginViewModel : ViewModel() {

    private val _user = MutableLiveData<User?>()
    val user: LiveData<User?> = _user

    private val _error = MutableLiveData<String?>()
    val error: LiveData<String?> = _error

    private val _loading = MutableLiveData<Boolean>()
    val loading: LiveData<Boolean> = _loading

    fun login(email: String, password: String) {
        viewModelScope.launch {
            _loading.value = true
            _error.value = null
            try {
                val api = RetrofitClient.getApiService()
                val response = api.login(LoginRequest(email, password))

                if (response.isSuccessful && response.body()?.success == true) {
                    val data = response.body()!!.data!!
                    RetrofitClient.setToken(data.token)
                    _user.value = data.user
                } else {
                    _error.value = response.body()?.message ?: "Ошибка входа"
                }
            } catch (e: Exception) {
                _error.value = e.localizedMessage ?: "Ошибка сети"
            } finally {
                _loading.value = false
            }
        }
    }
}
