<template>
  <AppLayout>
    <div class="sup-profile-root">
      <div class="profile-card">
        <div class="profile-hdr">
          <OperatorAvatar :avatar="me?.avatar" :name="me?.name" :color="me?.color" size="xl" />
          <div class="profile-info">
            <h2>{{ me?.name }}</h2>
            <p>{{ me?.role }}</p>
          </div>
        </div>

        <div class="edit-section">
          <h3>Edit Profile</h3>
          <div class="form-group">
            <label>Phone Number</label>
            <input type="text" v-model="formPhone" placeholder="09XX..." class="mes-input" />
          </div>
          <div class="form-group">
            <label>Full Name</label>
            <input type="text" v-model="formFullName" placeholder="Full legal name" class="mes-input" />
          </div>
          <div class="form-group">
            <label>PIN Code</label>
            <input type="password" v-model="formPin" placeholder="New PIN (leave blank to keep current)" class="mes-input" />
          </div>
          <button class="save-btn" @click="saveProfile">Save Changes</button>
        </div>

        <Transition name="fade">
          <div v-if="saved" class="toast">Profile updated successfully!</div>
        </Transition>
      </div>
    </div>
  </AppLayout>
</template>

<script setup>
// Developer: Mintesnot Abebe | Brand: dev MinteIO
import { ref, computed, onMounted, watch } from 'vue'
import AppLayout from '@/components/layout/AppLayout.vue'
import OperatorAvatar from '@/components/ui/OperatorAvatar.vue'
import { useMesStore } from '@/store/mesStore.js'
import { useSystemAuthStore } from '@/store/systemAuthStore.js'
import { supabase } from '@/lib/supabaseClient'

const store = useMesStore()
const sysAuth = useSystemAuthStore()

const me = computed(() => {
  if (sysAuth.currentEmployeeId) {
    const found = (store.operators || []).find(o => o.id === sysAuth.currentEmployeeId)
    if (found) return found
  }
  return (store.operators || []).find(o => ['admin', 'System Admin', 'manager', 'Supervisor'].includes(o.role)) || (store.operators || [])[0] || null
})

const formPhone = ref('')
const formFullName = ref('')
const formPin = ref('')
const saved = ref(false)

function populateForm() {
  if (me.value) {
    formPhone.value = me.value.phone_number || ''
    formFullName.value = me.value.full_name || me.value.name || ''
  }
}

onMounted(() => {
  populateForm()
})

watch(me, () => {
  populateForm()
})

async function saveProfile() {
  if (!me.value) return
  const payload = {
    phone_number: formPhone.value,
    full_name: formFullName.value
  }
  if (formPin.value.trim().length >= 4) {
    payload.pin_code = formPin.value.trim()
  }

  const { error } = await supabase
    .from('mes_operators')
    .update(payload)
    .eq('id', me.value.id)

  if (!error) {
    if (payload.pin_code) me.value.pin_code = payload.pin_code
    me.value.phone_number = payload.phone_number
    me.value.full_name = payload.full_name

    saved.value = true
    setTimeout(() => saved.value = false, 3000)
    formPin.value = ''
  } else {
    console.error('Failed to update profile', error)
  }
}
</script>

<style scoped>
.sup-profile-root {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  height: 100%;
  padding: 1rem;
  background: #0f172a;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  touch-action: pan-y;
}
@media (min-width: 768px) {
  .sup-profile-root {
    align-items: center;
    padding: 2rem;
  }
}

.profile-card {
  background: #1e293b;
  border-radius: 1rem;
  padding: 1.5rem;
  width: 100%;
  max-width: 500px;
  border: 1px solid rgba(255,255,255,0.05);
  position: relative;
  margin: auto;
}
@media (min-width: 768px) {
  .profile-card {
    padding: 2rem;
  }
}
.profile-hdr {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 1rem;
  border-bottom: 1px solid rgba(255,255,255,0.05);
  padding-bottom: 1.5rem;
  margin-bottom: 1.5rem;
}
@media (min-width: 768px) {
  .profile-hdr {
    flex-direction: row;
    text-align: left;
    gap: 1.5rem;
  }
}
.profile-info h2 {
  font-size: 1.8rem;
  font-weight: 800;
  color: #fff;
  margin: 0 0 0.2rem 0;
}
.profile-info p {
  color: #94a3b8;
  margin: 0;
  text-transform: capitalize;
}

.edit-section h3 {
  font-size: 1.2rem;
  color: #f1f5f9;
  margin-bottom: 1rem;
}
.form-group {
  margin-bottom: 1rem;
}
.form-group label {
  display: block;
  font-size: 0.85rem;
  color: #94a3b8;
  margin-bottom: 0.4rem;
}
.mes-input {
  width: 100%;
  padding: 0.8rem 1rem;
  background: #0f172a;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 0.5rem;
  color: #fff;
  font-size: 1rem;
  outline: none;
  box-sizing: border-box;
}
.mes-input:focus {
  border-color: #6366f1;
}

.save-btn {
  width: 100%;
  padding: 1rem;
  background: #6366f1;
  color: #fff;
  border: none;
  border-radius: 0.5rem;
  font-weight: 700;
  font-size: 1rem;
  cursor: pointer;
  margin-top: 1rem;
  transition: opacity 0.2s;
  touch-action: pan-y;
}
.save-btn:hover {
  opacity: 0.9;
}

.toast {
  position: absolute;
  bottom: 1rem;
  left: 50%;
  transform: translateX(-50%);
  background: #10b981;
  color: #fff;
  padding: 0.6rem 1.2rem;
  border-radius: 2rem;
  font-weight: 600;
  font-size: 0.9rem;
  white-space: nowrap;
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>
