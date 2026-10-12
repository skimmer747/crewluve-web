import { render } from 'preact'
import './styles/tokens.css'
import './styles/base.css'
import './styles/cards.css'
import './styles/trips.css'
import './styles/location.css'
import './styles/bigDial.css'
import './styles/sunPopup.css'
import './styles/inFlight.css'
import './styles/schedule.css'
import { Root } from './ui/Root'

render(<Root />, document.getElementById('app')!)
