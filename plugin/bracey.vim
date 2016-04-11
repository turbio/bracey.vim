"File:        bracey.vim
"Version:     0.0.1
"Repository:  https://github.com/turbio/vim-bracey
"License:     Released under the GPL V2 license

if !exists("g:bracey_server_log")
	let g:bracey_server_log = "/tmp/bracey_server_logfile"
endif

if !exists("g:bracey_server_path")
	let g:bracey_server_path = "http://127.0.0.1"
endif

if !exists("g:bracey_server_port")
	let g:bracey_server_port = 13378
endif

if !exists("g:bracey_server_allow_remote_connetions")
	let g:bracey_server_allow_remote_connetions = 0
endif

"if !exists("g:bracey_file_search_method")
	""auto/dir/cwd
	"let g:bracey_file_search_method = 'cwd'
"endif

"if !exists("g:bracey_file_search_path")
	"let g:bracey_file_search_path = ''
"endif

if !exists("g:bracey_auto_start_server")
	let g:bracey_auto_start_server = 1
endif

if !exists("g:bracey_eval_on_save")
	let g:bracey_eval_on_save = 1
endif

if !exists("g:bracey_refresh_on_save")
	let g:bracey_refresh_on_save = 0
endif

"if !exists("g:bracey_highligh_cursor")
	"let g:bracey_highligh_cursor = 1
"endif

"if !exists("g:bracey_live_update")
	"let g:bracey_live_update = 1
"endif

if !exists("g:bracey_auto_start_browser")
	let g:bracey_auto_start_browser = 1
endif

if !exists("g:bracey_browser_command")
	"0 = auto
	"'...' = command to run
	let g:bracey_browser_command = 0
endif

command! -nargs=0 Bracey call bracey#start()
command! -nargs=0 BraceyStop  call bracey#stop()
command! -nargs=0 BraceyReload call bracey#reload()
command! -nargs=* BraceyEval call bracey#evalFile(<f-args>)
