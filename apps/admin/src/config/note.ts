export const moodMap: Record<string, { label: string; color: string }> = {
	happy: { label: '開心', color: 'bg-green-100 text-green-800' },
	sad: { label: '難過', color: 'bg-blue-100 text-blue-800' },
	angry: { label: '生氣', color: 'bg-red-100 text-red-800' },
	excited: { label: '興奮', color: 'bg-yellow-100 text-yellow-800' },
	calm: { label: '平靜', color: 'bg-gray-100 text-gray-800' },
	anxious: { label: '焦慮', color: 'bg-purple-100 text-purple-800' },
}

export const weatherMap: Record<string, { label: string; color: string }> = {
	sunny: { label: '晴天', color: 'bg-yellow-100 text-yellow-800' },
	cloudy: { label: '多雲', color: 'bg-gray-100 text-gray-800' },
	rainy: { label: '下雨', color: 'bg-blue-100 text-blue-800' },
	snowy: { label: '下雪', color: 'bg-cyan-100 text-cyan-800' },
	windy: { label: '有風', color: 'bg-green-100 text-green-800' },
	stormy: { label: '暴風雨', color: 'bg-red-100 text-red-800' },
}

export const moodOptions = Object.entries(moodMap).map(([value, mood]) => ({
	value,
	label: mood.label,
}))

export const weatherOptions = Object.entries(weatherMap).map(
	([value, weather]) => ({
		value,
		label: weather.label,
	})
)
