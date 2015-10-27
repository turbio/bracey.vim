let s:plugin_path = expand('<sfile>:p:h:h')

function! brackets#start()
	execute 'cd' fnameescape(s:plugin_path . "/brackets")
	call system("node brackets.js > " . g:brackets_serverlog . " &")
	execute 'cd -'
	try
		write
		call brackets#setFile()
	catch
		call brackets#sendContents()
	endtry
	call brackets#setupHandlers()
endfunction

function! brackets#setupHandlers()
	autocmd CursorMoved,CursorMovedI,InsertChange *.html,*.js,*.css call brackets#setCursor()
	autocmd BufEnter *.html,*.js,*.css call brackets#setFile()
	autocmd BufWritePost *.js call brackets#evalFile()
endfunction

function! brackets#stop()
	"echom s:server_pid
	"call system("node brackets.js > " . g:brackets_serverlog . " &")
endfunction

function! brackets#sendContents()
	call brackets#sendCommand('c:'.join(getline(1, '$'), "\n"))
endfunction

function! brackets#evalFile()
	call brackets#sendCommand('e:'.expand('%'))
endfunction

function! brackets#reload()
	write
	call brackets#sendCommand('r:'.expand('%'))
endfunction

function! brackets#setFile()
	call brackets#sendCommand('f:'.expand('%'))
endfunction

function! brackets#setCursor()
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
