let s:plugin_path = expand('<sfile>:p:h:h')

function! brackets#start()
	write
	execute 'cd' fnameescape(s:plugin_path . "/brackets")
	call system("node brackets.js > " . g:brackets_serverlog . " &")
	execute 'cd -'
	call brackets#setupHandlers()
	call brackets#switchFile()
endfunction

function! brackets#setupHandlers()
	autocmd CursorMoved,CursorMovedI,InsertChange *.html,*.js,*.css call brackets#moveCursor()
	autocmd BufEnter *.html,*.js,*.css call brackets#switchFile()
endfunction

function! brackets#stop()
	"echom s:server_pid
	"call system("node brackets.js > " . g:brackets_serverlog . " &")
endfunction

function! brackets#reload()
	write
	call brackets#sendCommand('r:'.expand('%'))
endfunction

function! brackets#switchFile()
	call brackets#sendCommand('f:'.expand('%'))
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
