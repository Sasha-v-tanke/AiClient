package com.courier.messenger.ui.chat

import android.os.Bundle
import android.text.Editable
import android.text.TextWatcher
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.fragment.app.activityViewModels
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.courier.messenger.api.RetrofitClient
import com.courier.messenger.databinding.FragmentChatBinding
import com.courier.messenger.databinding.ItemMessageReceivedBinding
import com.courier.messenger.databinding.ItemMessageSentBinding
import com.courier.messenger.databinding.ItemMessageSystemBinding
import com.courier.messenger.models.Message
import com.courier.messenger.models.User
import com.google.gson.Gson
import java.text.SimpleDateFormat
import java.util.*

class ChatFragment : Fragment() {

    private var _binding: FragmentChatBinding? = null
    private val binding get() = _binding!!
    private val viewModel: ChatViewModel by activityViewModels()
    private lateinit var adapter: MessageAdapter
    private var chatId: String = ""
    private var typingHandler = android.os.Handler(android.os.Looper.getMainLooper())

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentChatBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        chatId = arguments?.getString("chatId") ?: return
        val chatTitle = arguments?.getString("chatTitle") ?: "Чат"

        binding.tvChatTitle.text = chatTitle

        setupRecyclerView()
        setupInput()
        observeViewModel()

        viewModel.loadMessages(chatId)
    }

    private fun setupRecyclerView() {
        val currentUserJson = RetrofitClient.loadUser(requireContext())
        val currentUser = Gson().fromJson(currentUserJson, User::class.java)

        adapter = MessageAdapter(currentUser?._id ?: "")
        binding.recyclerMessages.layoutManager =
            LinearLayoutManager(requireContext()).apply { stackFromEnd = true }
        binding.recyclerMessages.adapter = adapter
    }

    private fun setupInput() {
        binding.btnSend.setOnClickListener {
            val content = binding.etMessage.text.toString().trim()
            if (content.isNotEmpty()) {
                viewModel.sendMessage(chatId, content)
                binding.etMessage.text.clear()
                viewModel.sendStopTyping(chatId)
            }
        }

        binding.etMessage.addTextChangedListener(object : TextWatcher {
            override fun afterTextChanged(s: Editable?) {}
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {
                if (!s.isNullOrEmpty()) {
                    viewModel.sendTyping(chatId)
                    typingHandler.removeCallbacksAndMessages(null)
                    typingHandler.postDelayed({ viewModel.sendStopTyping(chatId) }, 2000)
                }
            }
        })
    }

    private fun observeViewModel() {
        viewModel.messages.observe(viewLifecycleOwner) { messages ->
            adapter.submitList(messages)
            if (messages.isNotEmpty()) {
                binding.recyclerMessages.scrollToPosition(messages.size - 1)
            }
        }

        viewModel.error.observe(viewLifecycleOwner) { error ->
            error?.let { Toast.makeText(requireContext(), it, Toast.LENGTH_SHORT).show() }
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        viewModel.leaveChat()
        typingHandler.removeCallbacksAndMessages(null)
        _binding = null
    }
}

class MessageAdapter(
    private val currentUserId: String
) : RecyclerView.Adapter<RecyclerView.ViewHolder>() {

    companion object {
        const val TYPE_SENT = 0
        const val TYPE_RECEIVED = 1
        const val TYPE_SYSTEM = 2
    }

    private val messages = mutableListOf<Message>()

    fun submitList(newMessages: List<Message>) {
        messages.clear()
        messages.addAll(newMessages)
        notifyDataSetChanged()
    }

    override fun getItemViewType(position: Int): Int {
        val msg = messages[position]
        return when {
            msg.messageType == "system" || msg.messageType == "status_update" -> TYPE_SYSTEM
            msg.sender?._id == currentUserId -> TYPE_SENT
            else -> TYPE_RECEIVED
        }
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): RecyclerView.ViewHolder {
        return when (viewType) {
            TYPE_SENT -> {
                val binding = ItemMessageSentBinding.inflate(
                    LayoutInflater.from(parent.context), parent, false
                )
                SentViewHolder(binding)
            }
            TYPE_RECEIVED -> {
                val binding = ItemMessageReceivedBinding.inflate(
                    LayoutInflater.from(parent.context), parent, false
                )
                ReceivedViewHolder(binding)
            }
            else -> {
                val binding = ItemMessageSystemBinding.inflate(
                    LayoutInflater.from(parent.context), parent, false
                )
                SystemViewHolder(binding)
            }
        }
    }

    override fun onBindViewHolder(holder: RecyclerView.ViewHolder, position: Int) {
        val msg = messages[position]
        when (holder) {
            is SentViewHolder -> holder.bind(msg)
            is ReceivedViewHolder -> holder.bind(msg)
            is SystemViewHolder -> holder.bind(msg)
        }
    }

    override fun getItemCount() = messages.size

    private fun formatTime(dateStr: String?): String {
        if (dateStr == null) return ""
        return try {
            val inputFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.getDefault())
            inputFormat.timeZone = TimeZone.getTimeZone("UTC")
            val date = inputFormat.parse(dateStr)
            SimpleDateFormat("HH:mm", Locale.getDefault()).format(date!!)
        } catch (e: Exception) { "" }
    }

    inner class SentViewHolder(
        private val binding: ItemMessageSentBinding
    ) : RecyclerView.ViewHolder(binding.root) {
        fun bind(msg: Message) {
            binding.tvContent.text = msg.content
            binding.tvTime.text = formatTime(msg.timestamp)
        }
    }

    inner class ReceivedViewHolder(
        private val binding: ItemMessageReceivedBinding
    ) : RecyclerView.ViewHolder(binding.root) {
        fun bind(msg: Message) {
            binding.tvSender.text = msg.sender?.username ?: "Система"
            binding.tvContent.text = msg.content
            binding.tvTime.text = formatTime(msg.timestamp)
        }
    }

    inner class SystemViewHolder(
        private val binding: ItemMessageSystemBinding
    ) : RecyclerView.ViewHolder(binding.root) {
        fun bind(msg: Message) {
            binding.tvContent.text = msg.content
        }
    }
}
