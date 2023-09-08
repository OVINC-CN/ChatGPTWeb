export const handleLoading = (loading, status) => {
  if (status) loading.value = true
  else setTimeout(() => loading.value = false, 600)
}
