import {mount,unmount} from 'svelte';
import Board from './Board.svelte';
export function mountBoard(target,props){const app=mount(Board,{target,props});return ()=>unmount(app);}
