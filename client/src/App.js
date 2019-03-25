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
      currentMessage: '',
      errors: ''
    }
  }

  createPeer = ({ signalCb, opts }) => {
    return new Peer({ trickle: false, ...opts })
    .on('error', (err) => {
      console.log('error', err)
      this.setState({ errors: this.state.errors + err })
    })

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
      // const player = document.querySelector('video')
      const player = document.querySelector('audio')
      try {
        player.srcObject = stream;
      } catch (error) {
        console.log('old browser video tag', error)
        player.src = URL.createObjectURL(stream);
      }
    })
  }

  connectChannel = () => {
    console.log('connecting channel')
    const { hub, channelName, peerId } = this.state

    hub.subscribe(channelName)
      .on('data', (signal) => {
        const parsedSignal = JSON.parse(signal)
        const sender = parsedSignal.sender

        if (sender !== peerId) {
          this.state.peer.signal(parsedSignal)
        }
      })

    const signalCb = (data) => {
      hub.broadcast(channelName, JSON.stringify(Object.assign(data, { sender: peerId })))
    }

    // this.getAudioStream()
    // .then((stream) => {
    //   console.log('getAudioStream stream', stream)
    //   const peer = this.createPeer({ isInitiator: true, signalCb, stream })
    //   this.setState({ peer })
    // })
    // .catch((err) => {
    //   console.error(err)
    //   this.setState({ errors: this.state.errors + err })
    // })
    const peer = this.createPeer({ signalCb, opts: { initiator: false, offerConstraints: { offerToReceiveAudio: true } }})
    this.setState({ peer })
  }

  startChannel = () => {
    console.log('starting channel')
    const { hub, channelName, peerId } = this.state
    // var sender

    hub.subscribe(channelName)
      .on('data', (signal) => {
        const parsedSignal = JSON.parse(signal)
        const sender = parsedSignal.sender

        if (sender !== peerId) {
          console.log(new Date().toLocaleTimeString(), 'msg in start', parsedSignal)
          this.state.peer.signal(parsedSignal)
        }
      })

      const signalCb = (data) => {
        hub.broadcast(channelName, JSON.stringify(Object.assign(data, { sender: peerId })))
      }

    this.getAudioStream()
    .then((stream) => {
      console.log('getAudioStream stream', stream)
      const peer = this.createPeer({ signalCb, opts: { initiator: true, stream, offerConstraints: { offerToReceiveAudio: false } } })
      this.setState({ peer })
    })
    .catch((err) => {
      console.error(err)
      this.setState({ errors: this.state.errors + err })
    })
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
        {/* <video muted playsInline></video> */}
        <audio controls autoPlay></audio>
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
