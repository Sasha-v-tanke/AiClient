package com.courier.messenger.ui.orders

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.fragment.app.activityViewModels
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.courier.messenger.R
import com.courier.messenger.api.RetrofitClient
import com.courier.messenger.databinding.FragmentOrdersBinding
import com.courier.messenger.databinding.ItemOrderBinding
import com.courier.messenger.models.Order
import com.courier.messenger.models.User
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.google.gson.Gson

class OrderListFragment : Fragment() {

    private var _binding: FragmentOrdersBinding? = null
    private val binding get() = _binding!!
    private val viewModel: OrderViewModel by activityViewModels()
    private lateinit var adapter: OrderAdapter
    private var currentUser: User? = null

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentOrdersBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        val userJson = RetrofitClient.loadUser(requireContext())
        currentUser = Gson().fromJson(userJson, User::class.java)

        setupRecyclerView()
        setupFilters()
        observeViewModel()

        viewModel.loadOrders()

        binding.swipeRefresh.setOnRefreshListener {
            val selectedFilter = getSelectedFilter()
            viewModel.loadOrders(selectedFilter)
        }
    }

    private fun setupRecyclerView() {
        adapter = OrderAdapter(
            currentUser = currentUser,
            onStatusUpdate = { order, newStatus ->
                showStatusConfirmDialog(order, newStatus)
            }
        )
        binding.recyclerOrders.layoutManager = LinearLayoutManager(requireContext())
        binding.recyclerOrders.adapter = adapter
    }

    private fun setupFilters() {
        binding.chipAll.setOnClickListener { viewModel.loadOrders(null) }
        binding.chipCreated.setOnClickListener { viewModel.loadOrders("created") }
        binding.chipAssigned.setOnClickListener { viewModel.loadOrders("assigned") }
        binding.chipInTransit.setOnClickListener { viewModel.loadOrders("in_transit") }
    }

    private fun getSelectedFilter(): String? {
        return when {
            binding.chipCreated.isChecked -> "created"
            binding.chipAssigned.isChecked -> "assigned"
            binding.chipInTransit.isChecked -> "in_transit"
            else -> null
        }
    }

    private fun showStatusConfirmDialog(order: Order, newStatus: String) {
        val statusNames = mapOf(
            "assigned" to "Принят",
            "picked_up" to "Забран",
            "in_transit" to "В пути",
            "delivered" to "Доставлен",
            "problem" to "Проблема",
            "cancelled" to "Отменён"
        )

        MaterialAlertDialogBuilder(requireContext())
            .setTitle("Изменить статус")
            .setMessage("Изменить статус заказа на \"${statusNames[newStatus]}\"?")
            .setPositiveButton("Да") { _, _ ->
                viewModel.updateStatus(order._id, newStatus)
            }
            .setNegativeButton("Отмена", null)
            .show()
    }

    private fun observeViewModel() {
        viewModel.orders.observe(viewLifecycleOwner) { orders ->
            adapter.submitList(orders)
            binding.swipeRefresh.isRefreshing = false
            binding.tvEmpty.visibility = if (orders.isEmpty()) View.VISIBLE else View.GONE
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

        viewModel.statusUpdated.observe(viewLifecycleOwner) { updated ->
            if (updated == true) {
                Toast.makeText(requireContext(), "Статус обновлён", Toast.LENGTH_SHORT).show()
            }
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}

class OrderAdapter(
    private val currentUser: User?,
    private val onStatusUpdate: (Order, String) -> Unit
) : RecyclerView.Adapter<OrderAdapter.OrderViewHolder>() {

    private val orders = mutableListOf<Order>()

    fun submitList(newOrders: List<Order>) {
        orders.clear()
        orders.addAll(newOrders)
        notifyDataSetChanged()
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): OrderViewHolder {
        val binding = ItemOrderBinding.inflate(
            LayoutInflater.from(parent.context), parent, false
        )
        return OrderViewHolder(binding)
    }

    override fun onBindViewHolder(holder: OrderViewHolder, position: Int) {
        holder.bind(orders[position])
    }

    override fun getItemCount() = orders.size

    inner class OrderViewHolder(
        private val binding: ItemOrderBinding
    ) : RecyclerView.ViewHolder(binding.root) {

        fun bind(order: Order) {
            binding.tvOrderId.text = "#${order._id.takeLast(6).uppercase()}"
            binding.tvPickupAddress.text = "📍 ${order.pickupAddress}"
            binding.tvDeliveryAddress.text = "🏠 ${order.deliveryAddress}"
            binding.tvStatus.text = getStatusText(order.status)
            binding.tvStatus.setBackgroundResource(getStatusColor(order.status))

            // Кнопки действий
            binding.layoutActions.removeAllViews()
            val nextStatuses = getNextStatuses(order)
            nextStatuses.forEach { status ->
                val button = android.widget.Button(binding.root.context).apply {
                    text = getStatusText(status)
                    setOnClickListener { onStatusUpdate(order, status) }
                }
                binding.layoutActions.addView(button)
            }

            binding.layoutActions.visibility =
                if (nextStatuses.isEmpty()) View.GONE else View.VISIBLE
        }

        private fun getNextStatuses(order: Order): List<String> {
            val role = currentUser?.role ?: return emptyList()
            return when (order.status) {
                "created" -> if (role == "courier") listOf("assigned") else emptyList()
                "assigned" -> if (role == "courier") listOf("picked_up") else emptyList()
                "picked_up" -> if (role == "courier") listOf("in_transit") else emptyList()
                "in_transit" -> if (role == "courier") listOf("delivered", "problem") else emptyList()
                else -> emptyList()
            }
        }

        private fun getStatusText(status: String): String {
            return when (status) {
                "created" -> "Создан"
                "assigned" -> "Принят"
                "picked_up" -> "Забран"
                "in_transit" -> "В пути"
                "delivered" -> "Доставлен"
                "problem" -> "Проблема"
                "cancelled" -> "Отменён"
                else -> status
            }
        }

        private fun getStatusColor(status: String): Int {
            return when (status) {
                "created" -> android.R.color.holo_orange_light
                "assigned", "picked_up", "in_transit" -> android.R.color.holo_blue_light
                "delivered" -> android.R.color.holo_green_light
                "problem", "cancelled" -> android.R.color.holo_red_light
                else -> android.R.color.transparent
            }
        }
    }
}
