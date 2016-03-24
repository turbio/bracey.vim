"File:        brackets.vim
"Version:     0.0.1
"Repository:  https://github.com/turbio/vim-brackets
"License:     Released under the GPL V2 license

if !exists("g:brackets_server_log")
	let g:brackets_server_log = "/tmp/brackets_server_logfile"
endif

if !exists("g:brackets_server_path")
	let g:brackets_server_path = "http://127.0.0.1"
endif

if !exists("g:brackets_server_port")
	let g:brackets_server_port = 13378
endif

if !exists("g:brackets_server_allow_remote_connetions")
	let g:brackets_server_allow_remote_connetions = 0
endif

"if !exists("g:brackets_file_search_method")
	""auto/dir/cwd
	"let g:brackets_file_search_method = 'cwd'
"endif

"if !exists("g:brackets_file_search_path")
	"let g:brackets_file_search_path = ''
"endif

if !exists("g:brackets_remote_connections")
	let g:brackets_remote_connections = 0
endif

if !exists("g:brackets_auto_start_server")
	let g:brackets_auto_start_server = 1
endif

if !exists("g:brackets_eval_on_save")
	let g:brackets_eval_on_save = 1
endif

if !exists("g:brackets_refresh_on_save")
	let g:brackets_refresh_on_save = 0
endif

"if !exists("g:brackets_highligh_cursor")
	"let g:brackets_highligh_cursor = 1
"endif

"if !exists("g:brackets_live_update")
	"let g:brackets_live_update = 1
"endif

if !exists("g:brackets_auto_start_browser")
	let g:brackets_auto_start_browser = 1
endif

if !exists("g:brackets_browser_command")
	"0 = auto
	"'...' = command to run
	let g:brackets_browser_command = 0
endif

command! -nargs=0 Brackets call brackets#start()
command! -nargs=0 BracketsStop  call brackets#stop()
command! -nargs=0 BracketsReload call brackets#reload()
command! -nargs=0 BracketsEval call brackets#eval()
