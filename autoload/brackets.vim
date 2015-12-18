let s:plugin_path = expand('<sfile>:p:h:h')

function! brackets#start()
	execute 'cd' fnameescape(s:plugin_path . "/brackets")
	call system("node brackets.js > " . g:brackets_serverlog . " &")
	execute 'cd -'
	try
		write
		call brackets#setFile()
	catch
		call brackets#sendCurrentBuffer()
	endtry
	call brackets#setupHandlers()
endfunction

function! brackets#setupHandlers()
	autocmd CursorMoved,CursorMovedI *.html,*.js,*.css call brackets#setCursor()
	autocmd TextChanged,TextChangedI * call brackets#bufferChange()
	autocmd BufEnter *.html,*.js,*.css call brackets#setFile()
	autocmd BufWritePost *.js call brackets#evalFile()
endfunction

function! brackets#stop()
	"echom s:server_pid
	"call system("node brackets.js > " . g:brackets_serverlog . " &")
endfunction

function! brackets#sendCurrentBuffer()
	call brackets#sendCommand('b:'.join(getline(1, '$'), "\n"))
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

function! brackets#bufferChange()
	"one day... this will be better, but for now... just send the whole buffer
	"every time there is a single change
	"this ends up sending WAY to much (like 1Mb/s according to ifconfig) over
	"the internal ip stack and also probably lags vim a lot if requests aren't async call
	call brackets#sendCurrentBuffer()
endfunction

function! brackets#setCursor()
	call brackets#sendCommand('p:'.line('.').':'.col('.'))
endfunction

python3 <<EOF
import sys
import requests
import vim

url = vim.eval("g:brackets_serverpath")

def send(msg):
	try:
		requests.post(
			url,
			data=msg)
	except:
		pass #for now
EOF

function! brackets#sendCommand(msg)
python3 <<EOF
send(vim.eval("a:msg"))
EOF
endfunction
