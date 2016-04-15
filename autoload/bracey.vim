let s:plugin_path = expand('<sfile>:p:h:h')
let s:bracey_server_process = 0

function! bracey#start()
	call bracey#initPython()

	if g:bracey_auto_start_server
		call bracey#startServer()
	endif

	call bracey#setupHandlers()

	"TODO: find a better way to do this than sleeping
	sleep 1000m
	call bracey#setVars()
	call bracey#setFile()

	if g:bracey_auto_start_browser
		call bracey#startBrowser(g:bracey_server_path.':'.g:bracey_server_port)
	endif
endfunction

function! bracey#startBrowser(url)
	if g:bracey_browser_command == 0
		call system('xdg-open '.a:url.' &')
	else
		call system(g:bracey_browser_command.' '.a:url.' &')
	endif
endfunction

function! bracey#startServer()
	if has('python3')
python3 <<EOF
args = [
	'node', 'bracey.js',
	'--port', vim.eval("g:bracey_server_port"),
]

if int(vim.eval("g:bracey_server_allow_remote_connetions")) != 0:
	args.append('--allow-remote-web')

print('starting server with args "' + str(args) + '"')
try:
	bracey_server_process = subprocess.Popen(
		args,
		cwd=vim.eval("s:plugin_path") + '/bracey',
		stdout=subprocess.PIPE,
		stderr=subprocess.PIPE)
except Exception as e:
	print('could not start bracey server: ' + str(e))

EOF
	elseif has('python')
python <<EOF
args = [
	'node', 'bracey.js',
	'--port', vim.eval("g:bracey_server_port"),
]

if int(vim.eval("g:bracey_server_allow_remote_connetions")) != 0:
	args.append('--allow-remote-web')

print('starting server with args "' + str(args) + '"')
try:
	bracey_server_process = subprocess.Popen(
		args,
		cwd=vim.eval("s:plugin_path") + '/bracey',
		stdout=subprocess.PIPE,
		stderr=subprocess.PIPE)
except Exception as e:
	print('could not start bracey server: ' + str(e))

EOF
	endif
endfunction

function! bracey#stopServer()
	"TODO: implement function
	if has('python3')
	elseif has('python')
	endif
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
	call bracey#stopServer()
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

function! bracey#initPython()
	if has('python3')
python3 <<EOF
import requests
import subprocess
import vim

bracey_server_process = None

url = vim.eval("g:bracey_server_path.':'.g:bracey_server_port")

def send(msg):
	try:
		requests.post(
			url,
			data=msg)
	except:
		pass #for now
EOF

	elseif has('python')
python <<EOF
import urllib2
import subprocess
import vim

bracey_server_process = None

url = vim.eval("g:bracey_server_path.':'.g:bracey_server_port")
opener = urllib2.build_opener(urllib2.ProxyHandler({}))

def send(msg):
	try:
		connection = opener.open(url, msg)
		result = connection.read()
	except:
		pass #for now
EOF
	endif
endfunction

function! bracey#sendCommand(msg)
	if has('python3')
python3 <<EOF
send(vim.eval("a:msg"))
EOF
	elseif has('python')
python <<EOF
send(vim.eval("a:msg"))
EOF
	endif
endfunction
