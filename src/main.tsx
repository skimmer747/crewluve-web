import { render } from 'preact'
import './styles/tokens.css'
import './styles/base.css'
import './styles/cards.css'
import './styles/trips.css'
import { Root } from './ui/Root'

render(<Root />, document.getElementById('app')!)
