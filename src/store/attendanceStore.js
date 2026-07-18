import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAttendanceStore = defineStore('attendance', () => {
  const shiftWindowStart = ref('07:30')
  const shiftWindowEnd = ref('08:15')

  function validateClockInTime() {
    const now = new Date()
    const currentHours = now.getHours()
    const currentMinutes = now.getMinutes()
    const currentTimeInMinutes = currentHours * 60 + currentMinutes

    const [startHour, startMinute] = shiftWindowStart.value.split(':').map(Number)
    const startTimeInMinutes = startHour * 60 + startMinute

    const [endHour, endMinute] = shiftWindowEnd.value.split(':').map(Number)
    const endTimeInMinutes = endHour * 60 + endMinute

    if (currentTimeInMinutes >= startTimeInMinutes && currentTimeInMinutes <= endTimeInMinutes) {
      return { allowed: true, message: '' }
    } else {
      return { allowed: false, message: 'CHECK-IN DENIED: Outside of designated shift window.' }
    }
  }

  return {
    shiftWindowStart,
    shiftWindowEnd,
    validateClockInTime
  }
})
