<!DOCTYPE html>
<html>
<head><title>Connecting...</title></head>
<body>
<p style="font-family: sans-serif; text-align: center; margin-top: 40px; color: #666;">
    {{ $message ?? 'Authorization complete. This window will close automatically.' }}
</p>
<script>
    if (window.opener) {
        window.close();
    } else {
        window.location.href = '{{ $redirect ?? "/integrations" }}';
    }
</script>
</body>
</html>
