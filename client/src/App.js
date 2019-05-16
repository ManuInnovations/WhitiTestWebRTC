import React, { Component } from 'react';
import Peer from 'simple-peer'
import signalhub from 'signalhub'
import cuid from 'cuid'

import './App.css';

class App extends Component {
  constructor () {
    super()
    this.state = {
      channelName: '',
      stream: null,
      listenerPeer: null,
      broadcasterPeers: null,
      id: null,
      recipient: null,
      hub: signalhub('test-whiti', [ 'https://signalhub-twkhucfxhs.now.sh/' ]),
      connected: false,
      messages: [],
      currentMessage: '',
      errors: ''
    }
  }

  createPeer = ({ signalCb, recipient, opts }) => {
    return new Peer({ trickle: false, ...opts })
    .on('error', (err) => {
      console.log('error', err)
      this.setState({ errors: this.state.errors + err })
    })

    .on('signal', signalCb)

    .on('connect', () => {
      const connectedMsg = `${this.state.id} has connected`
      this.setState({
        connected: true,
        messages: this.state.messages.concat(connectedMsg)
      })
      if (this.state.listenerPeer) {
        this.state.listenerPeer.send(JSON.stringify({ sender: this.state.id, message: connectedMsg, connect: true }))
      } else {
        this.state.broadcasterPeers[recipient].send(JSON.stringify({ sender: this.state.id, message: connectedMsg, connect: true }))
      }
    })

    .on('data', (data) => {
      const parsedData = JSON.parse(data)
      const { sender, message, connect } = parsedData
      console.log('peer on data: ' + parsedData)
      if (message) {
        const constructedMessage = connect ? message : `${sender}: ${message}`
        this.setState({
          messages: this.state.messages.concat(constructedMessage)
        })
      }
    })

    .on('stream', (stream) => {
      console.log('peer on stream')
      const player = document.querySelector('audio')
      try {
        player.srcObject = stream;
      } catch (error) {
        console.log('old browser?', error)
        player.src = URL.createObjectURL(stream);
      }
    })
  }

  connectChannel = () => {
    console.log('connecting channel')
    const { hub, channelName } = this.state

    this.setState({ id: cuid() }, () => {
      hub.subscribe(channelName).on('data', this.handleHubDataAsListener)

      const listenerPeer = this.createPeer({ signalCb: this.signalCb(), opts: { initiator: true, offerConstraints: { offerToReceiveAudio: true } }})
      this.setState({ listenerPeer })
    })
  }

  startChannel = () => {
    console.log('starting channel')
    const { hub, channelName } = this.state

    this.getAudioStream()
    .then((stream) => {
      this.setState({ id: cuid(), stream }, () => {
        hub.subscribe(channelName).on('data', this.handleHubDataAsBroadcaster)
      })
    })
    .catch((err) => {
      console.error(err)
      this.setState({ errors: this.state.errors + err })
    })
  }

  handleHubDataAsBroadcaster = (signal) => {
    const { broadcasterPeers, id, stream } = this.state
    const parsedSignal = JSON.parse(signal)
    const { type, sender } = parsedSignal

    if (type === 'offer') {
      // a new listener is trying to connect
      const newPeer = this.createPeer({ signalCb: this.signalCb(sender), recipient: sender, opts: { initiator: false, stream, offerConstraints: { offerToReceiveAudio: false } } })
      this.setState({
        broadcasterPeers: {...broadcasterPeers, [sender]: newPeer }
      }, () => {
        newPeer.signal(parsedSignal)
      })
    } else if (sender !== id) {
      // signal if the sender is anyone else
      broadcasterPeers[sender].signal(parsedSignal)
    }
  }

  handleHubDataAsListener = (signal) => {
    const { listenerPeer, id } = this.state
    const parsedSignal = JSON.parse(signal)
    const { recipient } = parsedSignal

    // signal only if the recipient is us
    if (recipient === id) {
      listenerPeer.signal(parsedSignal)
    }
  }

  signalCb = (recipient) => (data) => {
    // if listener calling this, recipient will be undefined
    const { hub, channelName, id } = this.state
    hub.broadcast(channelName, JSON.stringify(Object.assign(data, { sender: id, recipient })))
  }

  getAudioStream = () => {
    return navigator.mediaDevices.getUserMedia({ video: false, audio: true })
    .then((stream) => {
      return stream
    })
    .catch((err) => {
      return err
    })
  }

  updateChannelName = (ev) => {
    this.setState({
      channelName: ev.target.value
    })
  }

  updateCurrentMessage = (ev) => {
    this.setState({
      currentMessage: ev.target.value
    })
  }

  sendMessage = () => {
    const { listenerPeer, broadcasterPeers, id, messages, currentMessage } = this.state
    if (listenerPeer) {
      listenerPeer.send(JSON.stringify({ sender: id, message: currentMessage }))
    } else {
      Object.keys(broadcasterPeers).forEach((peer) => {
        broadcasterPeers[peer].send(JSON.stringify({ sender: id, message: currentMessage }))
      })
    }

    this.setState({
      currentMessage: '',
      messages: messages.concat(currentMessage)
    })
  }

  render() {
    return (
      <div className="App">
        <div style={{ display: 'flex', flexDirection: 'column', width: '200px' }}>
          <input value={this.state.channelName} onChange={this.updateChannelName}></input>
          <div style={{ display: 'flex', flexDirection: 'row' }}>
            <button onClick={this.connectChannel}>CONNECT</button>
            <button onClick={this.startChannel}>START</button>
          </div>
        </div>
        <audio controls></audio>
        {
          this.state.errors
          ? <p>{this.state.errors}</p>
          : null
        }
        <div>
          <label>message:</label>
          <input value={this.state.currentMessage} onChange={this.updateCurrentMessage}></input>
          <button onClick={this.sendMessage}>send</button>
          <div>
            <h3>MESSAGES:</h3>
            {
              this.state.messages.map((m, i) => {
                return (
                  <p key={i}>{m}</p>
                )
              })
            }
          </div>
        </div>
      </div>
    );
  }
}

export default App;
