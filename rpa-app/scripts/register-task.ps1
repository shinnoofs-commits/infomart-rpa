$taskName = "InfomartDeliSync2100"
$scriptPath = (Join-Path $PSScriptRoot "run-task.ps1")

$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$scriptPath`""
$trigger = New-ScheduledTaskTrigger -Daily -At 9:00PM
$settings = New-ScheduledTaskSettingsSet -WakeToRun -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -MultipleInstances IgnoreNew

try {
    Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Description "Infomart to Deli-supporter Daily 21:00 Sync (Auto Wake & Catchup)" -Force
    Write-Host "[SUCCESS] Windows Task '$taskName' registered successfully."
    Write-Host "Schedule: Daily at 21:00 (Wake computer enabled)"
} catch {
    Write-Error "Task registration failed: $_"
}
