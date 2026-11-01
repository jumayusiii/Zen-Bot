' Restores the saved PM2 process list at Windows logon without a console window.
Option Explicit

Dim fso, sh, base, nodeDir, pm2Cmd, q
Set fso = CreateObject("Scripting.FileSystemObject")
Set sh = CreateObject("WScript.Shell")

base = fso.GetParentFolderName(fso.GetParentFolderName(WScript.ScriptFullName))
sh.CurrentDirectory = base

nodeDir = sh.ExpandEnvironmentStrings("%LOCALAPPDATA%") & "\Programs\nodejs"
pm2Cmd = nodeDir & "\pm2.cmd"
If Not fso.FileExists(pm2Cmd) Then pm2Cmd = "pm2.cmd"

q = Chr(34)
sh.Run "cmd.exe /c " & q & q & pm2Cmd & q & " resurrect" & q, 0, False
