let s:plugin_path = expand('<sfile>:p:h:h')

function! brackets#start()
	execute 'cd' fnameescape(s:plugin_path . "/brackets")
	call system("node brackets.js > " . g:brackets_serverlog . " &")
	execute 'cd -'
	call brackets#setupHandlers()
endfunction

function! brackets#setupHandlers()
	au CursorMoved * call brackets#moveCursor()
	au CursorMovedI * call brackets#moveCursor()
	au InsertChange * call brackets#moveCursor()
endfunction

function! brackets#stop()
	"echom s:server_pid
	"call system("node brackets.js > " . g:brackets_serverlog . " &")
endfunction

function! brackets#moveCursor()
	call brackets#sendCommand('p:'.line('.').':'.col('.')."\nl:".getline('.'))
endfunction

python3 <<EOF
import sys
import requests
import vim

url = vim.eval("g:brackets_serverpath")
EOF

function! brackets#sendCommand(data)
python3 <<EOF
try:
	requests.post(
		url,
		data=vim.eval("a:data"))
except:
	pass #for now
EOF
endfunction
