let s:plugin_path = expand('<sfile>:p:h:h')

function! brackets#start()
	execute 'cd' fnameescape(s:plugin_path . "/brackets")
	call system("node brackets.js > " . g:brackets_serverlog . " &")
	execute 'cd -'
	call brackets#setupHandlers()
endfunction

function! brackets#setupHandlers()
	au CursorMoved * call brackets#moveCursor()
endfunction

function! brackets#stop()
	"echom s:server_pid
	"call system("node brackets.js > " . g:brackets_serverlog . " &")
endfunction

function! brackets#moveCursor()
	call browserlink#sendCommand("test")
endfunction

python3 <<EOF
import sys
import requests
import vim
EOF

function! browserlink#sendCommand(data)
python3 <<EOF
requests.post(
	vim.eval("g:brackets_serverpath"),
	data=vim.eval("a:data"))
EOF
endfunction
