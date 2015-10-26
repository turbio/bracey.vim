"File:        brackets.vim
"Version:     0.0.1
"Repository:  https://github.com/turbio/vim-brackets
"License:     Released under the GPL V2 license

if !exists("g:brackets_serverlog")
	let g:brackets_serverlog = "/tmp/brackets_server_logfile"
endif

if !exists("g:brackets_serverport")
	let g:brackets_serverport = 1337
endif

if !exists("g:brackets_serverpath")
	let g:brackets_serverpath = "http://127.0.0.1:1337"
endif

if !exists("g:brackets_pagefiletypes")
	let g:brackets_pagefiletypes = ["html", "css", "javascript"]
endif

let g:brackets_state = 0

command! -nargs=0 BracketsStart call brackets#start()
command! -nargs=0 BracketsStop  call brackets#stop()
