import subprocess
import vim
import sys

python_version = int(sys.version[0])

if python_version is 2:
	import urllib2
else:
	import requests

bracey_server_process = None
url = vim.eval("g:bracey_server_path.':'.g:bracey_server_port")

if python_version is 2:
	opener = urllib2.build_opener(urllib2.ProxyHandler({}))


def send(msg):
	if python_version is 2:
		try:
			opener.open(url, msg).read()
		except:
			pass  # for now
	else:
		try:
			requests.post(url, data=msg)
		except:
			pass  # for now


def startServer():
	global bracey_server_process
	if bracey_server_process is not None:
		print('server already running')
		return

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
			stderr=subprocess.PIPE,
			stdin=subprocess.PIPE)
	except Exception as e:
		print('could not start bracey server: ' + str(e))


def stopServer():
	global bracey_server_process

	if bracey_server_process is None:
		print('server not running')
		return

	bracey_server_process.terminate()
	bracey_server_process.wait()
	bracey_server_process = None
