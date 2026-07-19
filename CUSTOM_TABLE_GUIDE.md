# Custom Table Implementation Guide (Vue 3 + Tailwind CSS)

This guide provides a comprehensive approach to implementing a reusable, customizable table component in our Vue 3 application. It leverages the Composition API and Tailwind CSS for styling.

## 1. Table Architecture

The custom table should be divided into manageable components to ensure reusability and clean code:

*   **`CustomTable.vue`**: The main container component. It handles data processing (sorting, pagination) and manages the state.
*   **`TableHeader.vue`**: Renders the column headers, handles sorting events.
*   **`TableRow.vue`**: Renders individual rows. It should support slots for custom cell rendering.
*   **`TablePagination.vue`**: Handles page navigation.

## 2. Component Implementation (Example)

### 2.1 The Main `CustomTable.vue` Component

Create a new file `src/components/CustomTable.vue`:

```vue
<template>
  <div class="overflow-x-auto shadow-md sm:rounded-lg">
    <table class="w-full text-sm text-left text-gray-500">
      <thead class="text-xs text-gray-700 uppercase bg-gray-50">
        <tr>
          <!-- Loop through columns provided via props -->
          <th 
            v-for="col in columns" 
            :key="col.key"
            scope="col" 
            class="px-6 py-3 cursor-pointer select-none"
            @click="handleSort(col.key)"
          >
            <div class="flex items-center">
              {{ col.label }}
              <!-- Sort Icons -->
              <span v-if="sortKey === col.key" class="ml-1">
                <svg v-if="sortOrder === 'asc'" class="w-3 h-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 10 14"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 1v12m0-12L1 5m4-4 4 4"/></svg>
                <svg v-else class="w-3 h-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 10 14"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13V1m0 12l-4-4m4 4 4-4"/></svg>
              </span>
            </div>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr 
          v-for="(row, index) in paginatedData" 
          :key="row.id || index"
          class="bg-white border-b hover:bg-gray-50"
        >
          <td 
            v-for="col in columns" 
            :key="col.key" 
            class="px-6 py-4"
          >
            <!-- Use a scoped slot for custom rendering, fallback to raw data -->
            <slot :name="`cell-${col.key}`" :row="row">
              {{ row[col.key] }}
            </slot>
          </td>
        </tr>
        <tr v-if="paginatedData.length === 0">
          <td :colspan="columns.length" class="px-6 py-4 text-center text-gray-500">
            No data available.
          </td>
        </tr>
      </tbody>
    </table>
    
    <!-- Simple Pagination Example -->
    <div class="flex items-center justify-between p-4 border-t border-gray-200">
      <span class="text-sm text-gray-700">
        Showing 
        <span class="font-semibold text-gray-900">{{ (currentPage - 1) * itemsPerPage + 1 }}</span>
        to
        <span class="font-semibold text-gray-900">{{ Math.min(currentPage * itemsPerPage, sortedData.length) }}</span>
        of
        <span class="font-semibold text-gray-900">{{ sortedData.length }}</span>
        Entries
      </span>
      <div class="inline-flex mt-2 xs:mt-0">
        <button 
          @click="prevPage" 
          :disabled="currentPage === 1"
          class="flex items-center justify-center px-3 h-8 text-sm font-medium text-white bg-gray-800 rounded-l hover:bg-gray-900 disabled:bg-gray-400"
        >
          Prev
        </button>
        <button 
          @click="nextPage"
          :disabled="currentPage === totalPages"
          class="flex items-center justify-center px-3 h-8 text-sm font-medium text-white bg-gray-800 border-0 border-l border-gray-700 rounded-r hover:bg-gray-900 disabled:bg-gray-400"
        >
          Next
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';

const props = defineProps({
  columns: {
    type: Array,
    required: true,
    // Example: [{ key: 'id', label: 'ID' }, { key: 'name', label: 'Name' }]
  },
  data: {
    type: Array,
    required: true,
  },
  itemsPerPage: {
    type: Number,
    default: 10
  }
});

const sortKey = ref('');
const sortOrder = ref('asc'); // 'asc' or 'desc'
const currentPage = ref(1);

// Handle Sorting logic
const handleSort = (key) => {
  if (sortKey.value === key) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortKey.value = key;
    sortOrder.value = 'asc';
  }
};

const sortedData = computed(() => {
  if (!sortKey.value) return props.data;
  
  return [...props.data].sort((a, b) => {
    const valA = a[sortKey.value];
    const valB = b[sortKey.value];
    
    let modifier = 1;
    if (sortOrder.value === 'desc') modifier = -1;
    
    if (valA < valB) return -1 * modifier;
    if (valA > valB) return 1 * modifier;
    return 0;
  });
});

// Handle Pagination logic
const totalPages = computed(() => Math.ceil(sortedData.value.length / props.itemsPerPage));

const paginatedData = computed(() => {
  const start = (currentPage.value - 1) * props.itemsPerPage;
  const end = start + props.itemsPerPage;
  return sortedData.value.slice(start, end);
});

const prevPage = () => {
  if (currentPage.value > 1) currentPage.value--;
};

const nextPage = () => {
  if (currentPage.value < totalPages.value) currentPage.value++;
};
</script>
```

## 3. How to Use the Custom Table

To use the table in your views, you need to define the columns configuration and pass the data.

### Basic Usage

```vue
<template>
  <div class="p-6">
    <h1 class="text-2xl font-bold mb-4">Users List</h1>
    
    <CustomTable 
      :columns="tableColumns" 
      :data="usersData" 
      :itemsPerPage="5"
    >
      <!-- Example of custom slot rendering for the 'status' column -->
      <template #cell-status="{ row }">
        <span 
          class="px-2 py-1 rounded-full text-xs font-medium"
          :class="{
            'bg-green-100 text-green-800': row.status === 'Active',
            'bg-red-100 text-red-800': row.status === 'Inactive'
          }"
        >
          {{ row.status }}
        </span>
      </template>
      
      <!-- Example of custom slot rendering for actions -->
      <template #cell-actions="{ row }">
        <button @click="editUser(row)" class="text-blue-600 hover:underline mr-2">Edit</button>
        <button @click="deleteUser(row)" class="text-red-600 hover:underline">Delete</button>
      </template>
    </CustomTable>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import CustomTable from '@/components/CustomTable.vue';

// Define the columns. 'key' maps to the property in the data object.
const tableColumns = ref([
  { key: 'id', label: 'ID' },
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email Address' },
  { key: 'status', label: 'Account Status' },
  { key: 'actions', label: 'Actions' } // Actions column doesn't need to exist in data
]);

// Sample data
const usersData = ref([
  { id: 1, name: 'John Doe', email: 'john@example.com', status: 'Active' },
  { id: 2, name: 'Jane Smith', email: 'jane@example.com', status: 'Inactive' },
  { id: 3, name: 'Bob Johnson', email: 'bob@example.com', status: 'Active' },
  { id: 4, name: 'Alice Brown', email: 'alice@example.com', status: 'Active' },
  { id: 5, name: 'Charlie Davis', email: 'charlie@example.com', status: 'Inactive' },
  { id: 6, name: 'Eve Wilson', email: 'eve@example.com', status: 'Active' },
]);

const editUser = (user) => {
  console.log('Editing user:', user);
};

const deleteUser = (user) => {
  console.log('Deleting user:', user);
};
</script>
```

## 4. Key Features Implemented

1.  **Dynamic Columns**: Columns are defined via a prop, making the component completely agnostic to the data it displays.
2.  **Sorting**: Clicking on a column header toggles sorting (asc/desc) for that specific column.
3.  **Pagination**: Built-in client-side pagination.
4.  **Custom Cells (Slots)**: The most powerful feature. By using `<slot :name="'cell-' + col.key" :row="row">`, the parent component can completely customize how a specific cell is rendered (e.g., adding status badges, buttons, images) without changing the `CustomTable` component itself.
5.  **Tailwind Styling**: The component uses standard Tailwind classes for a clean, modern look.

## 5. Next Steps / Advanced Features to Add

If you need more advanced functionality in the future, consider adding:

*   **Global Search/Filtering**: A search input above the table that filters the `data` array before pagination.
*   **Server-Side Processing**: If dealing with thousands of rows, update the component to emit `update:page` and `update:sort` events so the parent can fetch the correct data from the API.
*   **Row Selection**: Add checkboxes to select rows for bulk actions.
*   **Sticky Headers**: Keep the header visible when scrolling through many rows.
