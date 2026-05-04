package com.courier.messenger.ui.chat

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.fragment.app.activityViewModels
import androidx.navigation.fragment.findNavController
import androidx.recyclerview.widget.LinearLayoutManager
import com.courier.messenger.R
import com.courier.messenger.databinding.FragmentChatListBinding
import com.courier.messenger.models.Chat
import com.courier.messenger.api.RetrofitClient
import com.google.gson.Gson
import com.courier.messenger.models.User
import androidx.recyclerview.widget.RecyclerView
import com.courier.messenger.databinding.ItemChatBinding
import java.text.SimpleDateFormat
import java.util.*

class ChatListFragment : Fragment() {

    private var _binding: FragmentChatListBinding? = null
    private val binding get() = _binding!!
    private val viewModel: ChatViewModel by activityViewModels()
    private lateinit var adapter: ChatAdapter
    private var currentUser: User? = null

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentChatListBinding.inflate(inflater, container, false)
        
        // Предзагрузка пользователя для адаптера
        try {
            val userJson = RetrofitClient.loadUser(requireContext())
            if (!userJson.isNullOrEmpty()) {
                currentUser = Gson().fromJson(userJson, User::class.java)
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
        
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        setupRecyclerView()
        observeViewModel()
        viewModel.loadChats()

        binding.swipeRefresh.setOnRefreshListener {
            viewModel.loadChats()
        }
    }

    private fun setupRecyclerView() {
        adapter = ChatAdapter(currentUser) { chat ->
            val bundle = Bundle().apply {
                putString("chatId", chat._id)
                putString("chatTitle", getChatTitle(chat))
            }
            findNavController().navigate(R.id.action_chatList_to_chat, bundle)
        }
        binding.recyclerChats.layoutManager = LinearLayoutManager(requireContext())
        binding.recyclerChats.adapter = adapter
    }

    private fun observeViewModel() {
        viewModel.chats.observe(viewLifecycleOwner) { chats ->
            val chatList = chats ?: emptyList()
            android.util.Log.d("ChatListFragment", "Получено чатов: ${chatList.size}")
            
            adapter.submitList(chatList)
            binding.swipeRefresh.isRefreshing = false
            
            if (chatList.isEmpty()) {
                binding.tvEmpty.visibility = View.VISIBLE
                binding.recyclerChats.visibility = View.GONE
                android.util.Log.d("ChatListFragment", "Список пуст, показываю tvEmpty")
            } else {
                binding.tvEmpty.visibility = View.GONE
                binding.recyclerChats.visibility = View.VISIBLE
                android.util.Log.d("ChatListFragment", "Список не пуст, показываю RecyclerView")
            }
        }

        viewModel.error.observe(viewLifecycleOwner) { error ->
            error?.let {
                Toast.makeText(requireContext(), it, Toast.LENGTH_SHORT).show()
                binding.swipeRefresh.isRefreshing = false
            }
        }

        viewModel.loading.observe(viewLifecycleOwner) { loading ->
            if (_binding != null && !binding.swipeRefresh.isRefreshing) {
                binding.progressBar.visibility = if (loading == true) View.VISIBLE else View.GONE
            }
        }
    }

    private fun getChatTitle(chat: Chat): String {
        if (!chat.name.isNullOrBlank()) return chat.name
        
        val participants = chat.participants ?: return "Чат"
        return participants
            .filter { it._id != currentUser?._id }
            .joinToString(", ") { it.username ?: "Аноним" }
            .ifEmpty { "Чат" }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}

class ChatAdapter(
    private val currentUser: User?,
    private val onChatClick: (Chat) -> Unit
) : RecyclerView.Adapter<ChatAdapter.ChatViewHolder>() {

    private val chats = mutableListOf<Chat>()

    fun submitList(newChats: List<Chat>) {
        chats.clear()
        chats.addAll(newChats)
        notifyDataSetChanged()
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ChatViewHolder {
        val binding = ItemChatBinding.inflate(
            LayoutInflater.from(parent.context), parent, false
        )
        return ChatViewHolder(binding)
    }

    override fun onBindViewHolder(holder: ChatViewHolder, position: Int) {
        holder.bind(chats[position])
    }

    override fun getItemCount() = chats.size

    inner class ChatViewHolder(
        private val binding: ItemChatBinding
    ) : RecyclerView.ViewHolder(binding.root) {

        fun bind(chat: Chat) {
            val title = if (!chat.name.isNullOrBlank()) {
                chat.name
            } else {
                chat.participants
                    ?.filter { it._id != currentUser?._id }
                    ?.joinToString(", ") { it.username ?: "Аноним" }
                    ?.ifEmpty { "Чат" } ?: "Чат"
            }

            binding.tvChatName.text = title
            binding.tvLastMessage.text = chat.lastMessage?.content ?: "Нет сообщений"

            // Время
            chat.lastMessage?.timestamp?.let { dateStr ->
                try {
                    val inputFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.getDefault())
                    inputFormat.timeZone = TimeZone.getTimeZone("UTC")
                    val date = inputFormat.parse(dateStr)
                    if (date != null) {
                        val outputFormat = SimpleDateFormat("HH:mm", Locale.getDefault())
                        binding.tvTime.text = outputFormat.format(date)
                    } else {
                        binding.tvTime.text = ""
                    }
                } catch (e: Exception) {
                    binding.tvTime.text = ""
                }
            } ?: run {
                binding.tvTime.text = ""
            }

            // Аватар — инициалы
            binding.tvAvatar.text = title.firstOrNull()?.uppercaseChar()?.toString() ?: "?"

            binding.tvBadge.visibility = View.GONE

            binding.root.setOnClickListener { onChatClick(chat) }
        }
    }
}
