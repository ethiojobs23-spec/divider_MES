<template>
  <div class="tab-content">
    <div class="production-list-card" style="max-width: 600px; margin: 0 auto;">
      <h3 style="margin-bottom: 1.5rem; border-bottom: 1px solid rgba(99,102,241,0.2); padding-bottom: 0.75rem;">Edit Profile</h3>
      
      <!-- Avatar Preview & Upload -->
      <div style="display: flex; flex-direction: column; align-items: center; gap: 1rem; margin-bottom: 2rem;">
        <OperatorAvatar :avatar="profileForm.avatar" :name="employee?.name" :color="employee?.color" size="xl" />
        
        <div style="position: relative;">
          <input type="file" accept="image/*" @change="handleAvatarSelected" style="position: absolute; opacity: 0; width: 100%; height: 100%; cursor: pointer;" :disabled="isUploadingAvatar" />
          <button class="nav-upload-btn" style="pointer-events: none;">
            <span class="material-symbols-rounded">{{ isUploadingAvatar ? 'hourglass_empty' : 'upload' }}</span>
            {{ isUploadingAvatar ? 'Uploading...' : 'Change Picture' }}
          </button>
        </div>
      </div>

      <div class="request-grid" style="grid-template-columns: 1fr;">
        <div class="input-group">
          <label>Full Name</label>
          <input v-model="profileForm.full_name" type="text" class="input-field" placeholder="Enter full name" />
        </div>
        
        <div class="input-group">
          <label>Phone Number</label>
          <input v-model="profileForm.phone_number" type="tel" class="input-field" placeholder="09..." />
        </div>
        
        <div class="input-group">
          <label>Date of Birth</label>
          <input v-model="profileForm.dob" type="date" class="input-field" />
        </div>
        
        <div class="input-group">
          <label>Confirm PIN to Save</label>
          <input v-model="profileForm.pinConfirm" type="password" maxlength="4" inputmode="numeric" class="input-field" placeholder="Enter 4-digit PIN" />
        </div>
      </div>

      <div style="margin-top: 2rem;">
        <button class="btn-submit-shift" style="width: 100%" @click="saveProfile" :disabled="isSavingProfile || !profileForm.pinConfirm">
          <span class="material-symbols-rounded">save</span>
          {{ isSavingProfile ? 'Saving...' : 'Save Profile' }}
        </button>
        <p v-if="profileMessage" class="success-msg" style="text-align: center; margin-top: 1rem;" :class="{'error-text': profileMessage.includes('Error') || profileMessage.includes('Incorrect')}">{{ profileMessage }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
// Developer: Mintesnot Abebe | Brand: dev MinteIO
import { ref, onMounted, watch } from 'vue'
import { supabase } from '@/lib/supabaseClient'
import { useMesStore } from '@/store/mesStore.js'
import OperatorAvatar from '@/components/ui/OperatorAvatar.vue'

const props = defineProps({
  employee: { type: Object, default: () => null }
})

const mesStore = useMesStore()

const profileForm = ref({ full_name: '', phone_number: '', dob: '', avatar: '', pinConfirm: '' })
const isUploadingAvatar = ref(false)
const isSavingProfile = ref(false)
const profileMessage = ref('')

function populateForm() {
  if (props.employee) {
    profileForm.value.full_name = props.employee.full_name || props.employee.name || ''
    profileForm.value.phone_number = props.employee.phone_number || ''
    profileForm.value.dob = props.employee.dob || ''
    profileForm.value.avatar = props.employee.avatar || ''
    profileForm.value.pinConfirm = ''
  }
}

onMounted(() => {
  populateForm()
})

watch(() => props.employee, () => {
  populateForm()
}, { deep: true })

async function handleAvatarSelected(event) {
  const file = event.target.files[0]
  if (!file || !props.employee) return
  isUploadingAvatar.value = true
  profileMessage.value = ''
  try {
    const fileExt = file.name.split('.').pop()
    const fileName = `${props.employee.id}_${Date.now()}.${fileExt}`
    const filePath = `${fileName}`
    const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file)
    if (uploadError) throw uploadError
    const { data } = supabase.storage.from('avatars').getPublicUrl(filePath)
    profileForm.value.avatar = data.publicUrl
    profileMessage.value = 'Avatar uploaded successfully! Click Save Profile to apply.'
  } catch (error) {
    console.error('Avatar upload failed:', error)
    profileMessage.value = 'Error uploading avatar: ' + error.message
  } finally {
    isUploadingAvatar.value = false
  }
}

async function saveProfile() {
  if (!props.employee) return
  if (String(profileForm.value.pinConfirm) !== String(props.employee.pin_code)) {
    profileMessage.value = 'Incorrect PIN. Profile not saved.'
    setTimeout(() => { profileMessage.value = '' }, 3000)
    return
  }
  isSavingProfile.value = true
  profileMessage.value = ''
  try {
    const payload = {
      full_name: profileForm.value.full_name,
      phone_number: profileForm.value.phone_number,
      dob: profileForm.value.dob || null,
      avatar: profileForm.value.avatar
    }

    const { error } = await supabase.from('mes_operators').update(payload).eq('id', props.employee.id)
    if (error) throw error
    profileMessage.value = 'Profile updated successfully!'
    profileForm.value.pinConfirm = ''
    mesStore.fetchInitialData()
  } catch (error) {
    console.error('Profile save failed:', error)
    profileMessage.value = 'Error saving profile: ' + error.message
  } finally {
    isSavingProfile.value = false
    setTimeout(() => { profileMessage.value = '' }, 3000)
  }
}
</script>

<style scoped>
.tab-content {
  animation: fadeIn 0.3s ease;
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.production-list-card {
  background: #1e293b;
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: 1.5rem;
  padding: 2.5rem;
}
.production-list-card h3 { margin: 0 0 1.5rem 0; font-size: 1.4rem; color: #f8fafc; }

.nav-upload-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  justify-content: center;
  background: rgba(99,102,241,0.1);
  border: 1px solid rgba(99,102,241,0.3);
  color: #818cf8;
  padding: 0.6rem 1.25rem;
  border-radius: 0.75rem;
  font-weight: 600;
  font-size: 0.95rem;
}

.request-grid {
  display: grid;
  gap: 1.25rem;
}

.input-group label {
  display: block;
  font-size: 0.9rem;
  font-weight: 600;
  color: #cbd5e1;
  margin-bottom: 0.5rem;
}
.input-field {
  width: 100%;
  padding: 1rem;
  background: #0f172a;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 0.75rem;
  color: #f1f5f9;
  font-size: 1.1rem;
  font-family: inherit;
  box-sizing: border-box;
}
.input-field:focus { outline: none; border-color: #6366f1; }

.btn-submit-shift {
  width: 100%;
  padding: 1.25rem;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: #fff;
  border: none;
  border-radius: 1rem;
  font-size: 1.15rem;
  font-weight: 800;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  transition: all 0.2s;
  box-shadow: 0 8px 25px rgba(99,102,241,0.3);
}
.btn-submit-shift:disabled { opacity: 0.4; cursor: not-allowed; box-shadow: none; }
.btn-submit-shift:not(:disabled):hover { filter: brightness(1.1); }

.success-msg { color: #34d399; font-weight: 600; margin-top: 1rem; text-align: center; }
.error-text { color: #f87171 !important; }

/* ── Mobile Responsive ────────────────────────────────────────────────────── */
@media (max-width: 768px) {
  .production-list-card {
    padding: 1.5rem 1rem;
  }
  .btn-submit-shift, .nav-upload-btn, .input-field {
    touch-action: pan-y;
  }
}
</style>
