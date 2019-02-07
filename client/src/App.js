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
      peer: null,
      peerId: cuid(),
      hub: signalhub('test-whiti', [ 'https://signalhub-twkhucfxhs.now.sh/' ]),
      connected: false,
      messages: [],
      currentMessage: ''
    }
  }

  createPeer = ({ isInitiator, signalCb }) => {
    return new Peer({ initiator: isInitiator, trickle: false })
    .on('error', function (err) { console.log('error', err) })

    .on('signal', (data) => {
      signalCb(data)
    })

    .on('connect', () => {
      console.log('CONNECT')
      const connectedMsg = `${this.state.peerId} has connected`
      this.setState({
        connected: true,
        messages: this.state.messages.concat(connectedMsg)
      })
      this.state.peer.send(JSON.stringify({ sender: this.state.peerId, message: connectedMsg, connect: true }))
    })

    .on('data', (data) => {
      const parsedData = JSON.parse(data)
      const { sender, message, connect } = parsedData
      console.log('parsedData: ' + parsedData)
      if (message) {
        const constructedMessage = connect ? message : `${sender}: ${message}`
        this.setState({
          messages: this.state.messages.concat(constructedMessage)
        })
      }
    })
  }

  connectChannel = () => {
    console.log('connecting channel')
    const { hub, channelName, peerId } = this.state

    hub.subscribe(channelName + `_${peerId}`)
      .on('data', (signal) => {
        const parsedSignal = JSON.parse(signal)
        console.log(new Date().toLocaleTimeString(), 'msg in connect', parsedSignal)
        this.state.peer.signal(parsedSignal)
      })

    const signalCb = (data) => {
      hub.broadcast(channelName, JSON.stringify(Object.assign(data, { sender: peerId })))
    }

    const peer = this.createPeer({ isInitiator: true, signalCb })
    this.setState({ peer })
  }

  startChannel = () => {
    console.log('starting channel')
    const { hub, channelName } = this.state
    let sender

    hub.subscribe(channelName)
      .on('data', (signal) => {
        const parsedSignal = JSON.parse(signal)
        sender = parsedSignal.sender
        console.log(new Date().toLocaleTimeString(), 'msg in start', parsedSignal)
        this.state.peer.signal(parsedSignal)
      })

    const signalCb = (data) => {
      hub.broadcast(channelName + `_${sender}`, JSON.stringify(data))
    }

    const peer = this.createPeer({ isInitiator: false, signalCb })
    this.setState({ peer })
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
    const { peer, peerId, messages, currentMessage } = this.state
    peer.send(JSON.stringify({ sender: peerId, message: currentMessage }))
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
