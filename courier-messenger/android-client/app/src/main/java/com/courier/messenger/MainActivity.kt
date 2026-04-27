package com.courier.messenger

import android.content.Intent
import android.os.Bundle
import android.view.View
import androidx.appcompat.app.AppCompatActivity
import androidx.navigation.fragment.NavHostFragment
import androidx.navigation.ui.setupWithNavController
import com.courier.messenger.api.RetrofitClient
import com.courier.messenger.databinding.ActivityMainBinding
import com.courier.messenger.socket.SocketManager
import com.courier.messenger.ui.auth.LoginActivity
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        // Проверяем токен
        val token = RetrofitClient.loadToken(this)
        if (token == null) {
            navigateToLogin()
            return
        }

        setupNavigation()
        connectSocket()
        verifyToken()
    }

    private fun setupNavigation() {
        val navHostFragment = supportFragmentManager
            .findFragmentById(R.id.nav_host_fragment) as NavHostFragment
        val navController = navHostFragment.navController

        binding.bottomNavigation.setupWithNavController(navController)
    }

    private fun connectSocket() {
        SocketManager.connect()
    }

    private fun verifyToken() {
        CoroutineScope(Dispatchers.Main).launch {
            try {
                val api = RetrofitClient.getApiService()
                val response = api.getMe()
                if (!response.isSuccessful || response.body()?.success != true || response.body()?.data == null) {
                    logout()
                }
            } catch (e: Exception) {
                // Игнорируем ошибки сети при проверке токена
            }
        }
    }

    fun logout() {
        SocketManager.disconnect()
        RetrofitClient.clearToken(this)
        navigateToLogin()
    }

    private fun navigateToLogin() {
        startActivity(Intent(this, LoginActivity::class.java))
        finish()
    }

    override fun onDestroy() {
        super.onDestroy()
        SocketManager.disconnect()
    }
}
