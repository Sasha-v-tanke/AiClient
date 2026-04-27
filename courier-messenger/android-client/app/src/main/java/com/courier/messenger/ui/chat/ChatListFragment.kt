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
import com.bumptech.glide.Glide
import androidx.recyclerview.widget.RecyclerView
import com.courier.messenger.databinding.ItemChatBinding
import java.text.SimpleDateFormat
import java.util.*

class ChatListFragment : Fragment() {

    private var _binding: FragmentChatListBinding? = null
    private val binding get() = _binding!!
    private val viewModel: ChatViewModel by activityViewModels()
    private lateinit var adapter: ChatAdapter

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentChatListBinding.inflate(inflater, container, false)
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
        adapter = ChatAdapter { chat ->
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
            adapter.submitList(chats)
            binding.swipeRefresh.isRefreshing = false
            binding.tvEmpty.visibility = if (chats.isEmpty()) View.VISIBLE else View.GONE
        }

        viewModel.error.observe(viewLifecycleOwner) { error ->
            error?.let {
                Toast.makeText(requireContext(), it, Toast.LENGTH_SHORT).show()
                binding.swipeRefresh.isRefreshing = false
            }
        }

        viewModel.loading.observe(viewLifecycleOwner) { loading ->
            if (!binding.swipeRefresh.isRefreshing) {
                binding.progressBar.visibility = if (loading) View.VISIBLE else View.GONE
            }
        }
    }

    private fun getChatTitle(chat: Chat): String {
        val currentUserJson = RetrofitClient.loadUser(requireContext())
        val currentUser = Gson().fromJson(currentUserJson, User::class.java)
        return chat.participants
            .filter { it._id != currentUser?._id }
            .joinToString(", ") { it.username }
            .ifEmpty { "Чат" }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}

class ChatAdapter(
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
            val currentUserJson = RetrofitClient.loadUser(binding.root.context)
            val currentUser = Gson().fromJson(currentUserJson, User::class.java)

            val title = chat.participants
                .filter { it._id != currentUser?._id }
                .joinToString(", ") { it.username }
                .ifEmpty { "Чат" }

            binding.tvChatTitle.text = title
            binding.tvLastMessage.text = chat.lastMessage?.content ?: "Нет сообщений"

            // Время
            chat.lastMessage?.createdAt?.let { dateStr ->
                try {
                    val inputFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.getDefault())
                    inputFormat.timeZone = TimeZone.getTimeZone("UTC")
                    val date = inputFormat.parse(dateStr)
                    val outputFormat = SimpleDateFormat("HH:mm", Locale.getDefault())
                    binding.tvTime.text = outputFormat.format(date!!)
                } catch (e: Exception) {
                    binding.tvTime.text = ""
                }
            }

            // Аватар — инициалы
            binding.tvAvatar.text = title.firstOrNull()?.uppercaseChar()?.toString() ?: "?"

            // Счётчик непрочитанных
            val unreadCount = chat.unreadCount ?: 0
            if (unreadCount > 0) {
                binding.tvBadge.visibility = View.VISIBLE
                binding.tvBadge.text = if (unreadCount > 99) "99+" else unreadCount.toString()
            } else {
                binding.tvBadge.visibility = View.GONE
            }

            binding.root.setOnClickListener { onChatClick(chat) }
        }
    }
}
