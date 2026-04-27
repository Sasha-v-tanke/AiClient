package com.courier.messenger.ui.auth

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.courier.messenger.MainActivity
import com.courier.messenger.api.RetrofitClient
import com.courier.messenger.databinding.ActivityLoginBinding
import com.courier.messenger.models.LoginRequest
import com.courier.messenger.models.RegisterRequest
import com.google.gson.Gson
import kotlinx.coroutines.launch

class LoginActivity : AppCompatActivity() {

    private lateinit var binding: ActivityLoginBinding
    private var isRegisterMode = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityLoginBinding.inflate(layoutInflater)
        setContentView(binding.root)

        // Проверяем сохранённый токен
        val savedToken = RetrofitClient.loadToken(this)
        if (savedToken != null) {
            navigateToMain()
            return
        }

        setupUI()
    }

    private fun setupUI() {
        binding.btnLogin.setOnClickListener {
            if (isRegisterMode) performRegister() else performLogin()
        }

        binding.tvToggleMode.setOnClickListener {
            isRegisterMode = !isRegisterMode
            updateUI()
        }

        updateUI()
    }

    private fun updateUI() {
        if (isRegisterMode) {
            binding.tvTitle.text = "🚚 Регистрация"
            binding.btnLogin.text = "Зарегистрироваться"
            binding.tvToggleMode.text = "Уже есть аккаунт? Войти"
            binding.layoutRegisterFields.visibility = View.VISIBLE
        } else {
            binding.tvTitle.text = "🚚 Courier Messenger"
            binding.btnLogin.text = "Войти"
            binding.tvToggleMode.text = "Нет аккаунта? Зарегистрироваться"
            binding.layoutRegisterFields.visibility = View.GONE
        }
    }

    private fun performLogin() {
        val email = binding.etEmail.text.toString().trim()
        val password = binding.etPassword.text.toString().trim()

        if (email.isEmpty() || password.isEmpty()) {
            Toast.makeText(this, "Заполните все поля", Toast.LENGTH_SHORT).show()
            return
        }

        setLoading(true)

        lifecycleScope.launch {
            try {
                val api = RetrofitClient.getApiService()
                val response = api.login(LoginRequest(email, password))

                if (response.isSuccessful && response.body()?.success == true) {
                    val data = response.body()!!.data!!
                    RetrofitClient.saveToken(this@LoginActivity, data.token)
                    RetrofitClient.saveUser(this@LoginActivity, Gson().toJson(data.user))
                    navigateToMain()
                } else {
                    val msg = response.body()?.message ?: "Ошибка входа"
                    Toast.makeText(this@LoginActivity, msg, Toast.LENGTH_LONG).show()
                }
            } catch (e: Exception) {
                Toast.makeText(
                    this@LoginActivity,
                    "Ошибка сети: ${e.localizedMessage}",
                    Toast.LENGTH_LONG
                ).show()
            } finally {
                setLoading(false)
            }
        }
    }

    private fun performRegister() {
        val username = binding.etUsername.text.toString().trim()
        val email = binding.etEmail.text.toString().trim()
        val password = binding.etPassword.text.toString().trim()
        val phone = binding.etPhone.text.toString().trim()
        val role = if (binding.spinnerRole.selectedItemPosition == 0) "courier" else "dispatcher"

        if (username.isEmpty() || email.isEmpty() || password.isEmpty() || phone.isEmpty()) {
            Toast.makeText(this, "Заполните все поля", Toast.LENGTH_SHORT).show()
            return
        }

        setLoading(true)

        lifecycleScope.launch {
            try {
                val api = RetrofitClient.getApiService()
                val response = api.register(
                    RegisterRequest(username, email, password, phone, role)
                )

                if (response.isSuccessful && response.body()?.success == true) {
                    val data = response.body()!!.data!!
                    RetrofitClient.saveToken(this@LoginActivity, data.token)
                    RetrofitClient.saveUser(this@LoginActivity, Gson().toJson(data.user))
                    navigateToMain()
                } else {
                    val msg = response.body()?.message ?: "Ошибка регистрации"
                    Toast.makeText(this@LoginActivity, msg, Toast.LENGTH_LONG).show()
                }
            } catch (e: Exception) {
                Toast.makeText(
                    this@LoginActivity,
                    "Ошибка сети: ${e.localizedMessage}",
                    Toast.LENGTH_LONG
                ).show()
            } finally {
                setLoading(false)
            }
        }
    }

    private fun setLoading(loading: Boolean) {
        binding.btnLogin.isEnabled = !loading
        binding.progressBar.visibility = if (loading) View.VISIBLE else View.GONE
        binding.btnLogin.text = if (loading) "Подождите..." else {
            if (isRegisterMode) "Зарегистрироваться" else "Войти"
        }
    }

    private fun navigateToMain() {
        startActivity(Intent(this, MainActivity::class.java))
        finish()
    }
}
