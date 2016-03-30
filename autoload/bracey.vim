let s:plugin_path = expand('<sfile>:p:h:h')

function! bracey#start()
	if g:bracey_auto_start_server
		call bracey#startServer()
	endif

	call bracey#setupHandlers()

	if g:bracey_auto_start_browser
		call bracey#startBrowser(g:bracey_server_path.':'.g:bracey_server_port)
	endif
endfunction

function! bracey#startBrowser(url)
	if g:bracey_browser_command == 0
		call system('xdg-open '.a:url.'&')
	else
		call system(g:bracey_browser_command.' '.a:url.'&')
	endif
endfunction

function! bracey#startServer()
	execute 'cd' fnameescape(s:plugin_path . "/bracey")
	if g:bracey_server_allow_remote_connetions
		call system("node bracey.js -a -p ".g:bracey_server_port." > " .g:bracey_server_log." &")
	else
		call system("node bracey.js -p ".g:bracey_server_port." > " .g:bracey_server_log." &")
	endif
	execute 'cd -'
	sleep 1000m
	call bracey#setVars()
	call bracey#setFile()
endfunction

function! bracey#setupHandlers()
	autocmd CursorMoved,CursorMovedI *.html,*.css call bracey#setCursor()
	autocmd TextChanged,TextChangedI *.html,*.css call bracey#bufferChange()
	autocmd BufEnter * call bracey#setFile()
	if g:bracey_eval_on_save
		autocmd BufWritePost *.js call bracey#evalFile()
	endif
	if g:bracey_refresh_on_save
		autocmd BufWritePost *.html call bracey#reload()
	endif
endfunction

function! bracey#stop()
endfunction

function! bracey#sendCurrentBuffer()
	let contents = join(getline(1, '$'), "\n")
	call bracey#sendCommand('b:'.len(contents).':'.contents)
endfunction

function! bracey#evalFile(...)
	if a:0
		let content = join(a:000, ' ')
		call bracey#sendCommand('e:'.len(content).':'.content)
	else
		let contents = join(getline(1, '$'), "\n")
		call bracey#sendCommand('e:'.len(contents).':'.contents)
	endif
endfunction

function! bracey#reload()
	let path = expand('%')
	call bracey#sendCommand('r:'.len(path).':'.path)
endfunction

function! bracey#setFile()
	let path = expand('%:p')
	let bufname = bufname('%')
	let bufnum = bufnr('%')
	let contents = join(getline(1, '$'), "\n")
	call bracey#sendCommand('f:'.len(bufnum).':'.bufnum.':'.len(bufname).':'.bufname.':'.len(path).':'.path.':'.len(&filetype).':'.&filetype.'b:'.len(contents).':'.contents)
endfunction

function! bracey#setVars()
	let cwd = getcwd()
	call bracey#sendCommand('v:'.len(cwd).':'.cwd)
endfunction

function! bracey#bufferChange()
	"one day... this will be better, but for now... just send the whole buffer
	"every time there is a single change
	"this ends up sending WAY to much (like 1Mb/s according to ifconfig) over
	"the internal ip stack and also probably lags vim a lot if requests aren't async call
	call bracey#sendCurrentBuffer()
endfunction

function! bracey#setCursor()
	let line = line('.')
	let column = col('.')
	call bracey#sendCommand('p:'.len(line).':'.line.':'.len(column).':'.column)
endfunction

if has('python3')

python3 <<EOF
import requests
import vim

url = vim.eval("g:bracey_server_path.':'.g:bracey_server_port")

def send(msg):
	try:
		requests.post(
			url,
			data=msg)
	except:
		pass #for now
EOF

endif

function! bracey#sendCommand(msg)
if has('python3')
python3 <<EOF
send(vim.eval("a:msg"))
EOF
endif
endfunction
