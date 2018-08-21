import React from 'react';
import {Editor, EditorState, RichUtils, convertToRaw, convertFromRaw} from 'draft-js'
import createStyles from 'draft-js-custom-styles';
import ColorMenu from './ColorMenu';
import FontMenu from './FontMenu';
import theme from '../theme/theme.js'

import {TextField, DialogTitle, DialogContentText, DialogContent, DialogActions, Dialog,
  CssBaseline, MuiThemeProvider, Typography, AppBar, Toolbar, Tooltip, Button, Popover,
  ClickAwayListener, Paper, MenuList, MenuItem, Snackbar, SnackbarContent, IconButton} from '@material-ui/core';

import {Close, TagFaces, Add, Save, CloudUpload, Home, FormatUnderlined, FormatBold,
  FormatItalic, FormatStrikethrough, FormatAlignRight, FormatAlignCenter, FormatAlignLeft,
  BorderColor, SaveAlt} from '@material-ui/icons';

const { styles, customStyleFn, exporter } = createStyles(['font-size', 'color', 'text-transform', 'text-alignment'], 'PREFIX_');
const styleMap = {
  'STRIKETHROUGH': {
    textDecoration: 'line-through',
  },
  'HIGHLIGHT' : {
    backgroundColor: 'yellow'
  }
}

var blockStyleFn = function(block){
  const type = block.getType();
  switch(type){
    case 'right':
      return 'alignRightClass';
      break;

    case 'left':
      return 'alignLeftClass';
      break;

    case 'center':
      return 'alignCenterClass';
      break;
  }
}

class Document extends React.Component {
  constructor(props){
    super(props);
    this.state = {
      editorState: EditorState.createEmpty(),
      // selectionState: EditorState.getSelection(),
      colorAnchorEl: null,
      fontAnchorEl: null,
      socket: this.props.socket,
      roomName: String(this.props.docSummary._id),
      editTitle: false,
      titleContent: '',
      shareUsername: '',
      shareUser: false,
      snackBarSaved: false,
    }
    this.onChange = (editorState) => {
      this.emitChange(editorState);
      // this.emitSelect(editorState.getSelection())
      this.setState({editorState})
    };
    this.setDomEditorRef = ref => this.domEditor = ref;
    this.handleKeyCommand = this.handleKeyCommand.bind(this);
  }

  componentDidMount(){
    console.log('in component did mount: this.props.docContent: ', this.props.docContent)
    if (this.props.docContent.editorState === null){
      null;
    } else{
      var convertedEditorState = convertFromRaw(JSON.parse(this.props.docContent.editorState));
      this.setState({
          editorState: EditorState.createWithContent(convertedEditorState)
      });
    }

    // //join document room, docInfo in this.props.docSummary
    // console.log(this.state.socket);
    // this.state.socket.join(this.state.roomName);
    // console.log('joined room ', this.state.roomName);

    //listen for doc change
    this.state.socket.on('newEditorState', (editorState) => {
      console.log("typeof editor State", typeof editorState)
      var parsed = JSON.parse(editorState)
      let contentState = convertFromRaw(parsed)
      this.setState({
          editorState: EditorState.createWithContent(contentState)
      });
    })
  }
  //tell everyone else what you're highlighting
  // emitSelect(selectionState) {
  //   var rawJsonSelectionState = convertToRaw(selectionState());
  //   this.state.socket.emit('docChange', {editorState: JSON.stringify(rawJsonEditorState), roomName:this.state.roomName})
  // }

  emitChange(editorState){
    //emit change
    var rawJsonEditorState = convertToRaw(editorState.getCurrentContent());
    this.state.socket.emit('docChange', {editorState: JSON.stringify(rawJsonEditorState), roomName:this.state.roomName})
  }

  handleKeyCommand(command, editorState) {
    const newState = RichUtils.handleKeyCommand(editorState, command);
    if (newState) {
      this.onChange(newState);
      return 'handled';
    }
    return 'not-handled';
  }

  _toggleStyle(e){
    e.preventDefault();
    var newStyle = e.currentTarget.getAttribute('value');
    this.onChange(RichUtils.toggleInlineStyle(this.state.editorState, newStyle));
  }

  _onRightAlignClick() {
    this.onChange(RichUtils.toggleBlockType(this.state.editorState, 'right'));
  }

  _onLeftAlignClick() {
    this.onChange(RichUtils.toggleBlockType(this.state.editorState, 'left'));
  }

  _onCenterAlignClick() {
    this.onChange(RichUtils.toggleBlockType(this.state.editorState, 'center'));
  }

  _hangleColorChange(e){
    this._setColorAnchorEl(e);
    var newColor = e.target.getAttribute('value');
    this.onChange(styles.color.toggle(this.state.editorState, newColor));
  }

  _setColorAnchorEl(e){
    this.setState({
      colorAnchorEl: e.currentTarget
    })
  }

  _hangleFontChange(e){
    this._setFontAnchorEl(e);
    var newFontSize = String(e.target.value).concat('px');
    this.onChange(styles.fontSize.toggle(this.state.editorState, newFontSize));
  }

  _setFontAnchorEl(e){
    this.setState({
      fontAnchorEl: e.currentTarget
    })
  }

  _handleMenuClose(){
    this.setState({
      colorAnchorEl: null,
      fontAnchorEl: null,
    });
  }

  _HandleFocus() {
    this.domEditor.focus()
  }

  _onSaveClick(e){
    var rawJsonEditorState = convertToRaw(this.state.editorState.getCurrentContent()); //maybe EditorState.convertToRaw(this.state.editorState.getCurrentContent());
    this.state.socket.emit('saveDocumentContents', {documentId: this.props.docSummary._id, editorState: JSON.stringify(rawJsonEditorState)})
    this.setState({
      snackBarSaved: true
    })
  }

  _onShareClick(e) {
    this.setState({
      shareUser: false
    })
    console.log("username state", this.state.shareUsername)
    this.state.socket.emit('inviteUser', {documentId: this.props.docSummary._id, username: this.state.shareUsername}) //need to add a newUserId parameter to this emit
  }

  _onBackClick() {
    this.props.docSummary();
  }

  _onHandleTitle() {
    this.setState({
      editTitle: true
    })
  }
  _onHandleTitleClose() {
    this.setState({
      editTitle: false
    })
  }

  _onHandleTitleSubmit() {
    this.setState({
      editTitle: false
    })
    console.log("title", this.state.titleContent)
    this.state.socket.emit('editTitle', ({id: this.props.docSummary._id, title: this.state.titleContent}))
  }

  handleOnChange(e) {
    this.setState({
      titleContent: e.target.value
    })
  }

  handleChangeUserShare(e) {
    this.setState({
      shareUsername: e.target.value
    })
  }

  _handleUserShareOpen() {
    this.setState({
      shareUser: true
    })
  }

  _handleCloseUserShare() {
    this.setState({
      shareUser: false
    })
  }

  _handleCloseSnackBar() {
    this.setState({
      snackBarSaved: false
    })
  }

  render(){
    const { colorAnchorEl } = this.state;
    const { fontAnchorEl } = this.state;

    const colorOpen = Boolean(colorAnchorEl);
    const fontOpen = Boolean(fontAnchorEl);

    return(
      <div className="textEditorGrandma">
        <MuiThemeProvider theme={theme}>
        <CssBaseline />
        <div className="docshare-toolbar">
          <AppBar postion="static" color="primary" className="appbarDoc">
            <Toolbar>
              <Typography variant="title" color="textPrimary" style={{flexGrow: 1}}>
                <Button onClick={() => this._onHandleTitle()}>{this.props.docSummary.name}</Button>
                <Dialog
                  open={this.state.editTitle}
                  onClose={() => this._onHandleTitleClose()}
                  >
                  <DialogTitle id="alert-dialog-title">{"Edit Title"}</DialogTitle>
                  <DialogContent>
                    <DialogContentText id="alert-dialog-description">
                      Change The Title of Your Document
                    </DialogContentText>
                    <TextField
                      type="text" name="newDocumentTitle"
                      label="Change Title"
                      className="tempyeet"
                      placeholder="Enter New Title Here"
                      fullWidth
                      onChange={(e) => this.handleOnChange(e)}
                    />
                  </DialogContent>
                  <DialogActions>
                    <Button onClick={() => this._onHandleTitleClose()} color="secondary">
                      Cancel
                    </Button>
                    <Button onClick={() => this._onHandleTitleSubmit()} color="secondary">
                      Submit
                    </Button>
                  </DialogActions>
                </Dialog>
              </Typography>
              <Button className="toolbar-btn" onClick={this._onSaveClick.bind(this)}>
                <Save />
              </Button>
              <Snackbar
                anchorOrigin={{
                  vertical: 'bottom',
                  horizontal: 'left',
                }}
                className="savedSnackBar"
                open={this.state.snackBarSaved}
                autoHideDuration={2000}
                onClose={() => this._handleCloseSnackBar()}
                ContentProps={{
                  'aria-describedby': 'message-saved',
                }}>
                <SnackbarContent
                  message={<span id="message-id">Document Saved</span>}
                  style={{backgroundColor: "#f8bbd0", color: "white"}}
                  action={[
                    <IconButton
                      key="close"
                      aria-label="Close"
                      color="inherit"
                      onClick={() => this._handleCloseSnackBar()}
                    >
                      <Close />
                    </IconButton>,
                  ]}
                />
              </Snackbar>
              <Tooltip disableFocusListener disableTouchListener title="Add Collaborators">
                <Button className="toolbar-btn" onClick={() => this._handleUserShareOpen()}>
                  <Add/>
                  <TagFaces/>
                </Button>
              </Tooltip>

              <Dialog
                open={this.state.shareUser}
                onClose={() => this._handleCloseUserShare()}
                >
                <DialogTitle id="alert-dialog-title">{"Share Document"}</DialogTitle>
                <DialogContent>
                  <DialogContentText id="alert-dialog-description">
                    Share Document With Others
                  </DialogContentText>
                  <TextField
                    type="text" name="newDocumentTitle"
                    label="Add User"
                    className="tempyeet"
                    placeholder="Enter Username"
                    fullWidth
                    onChange={(e) => this.handleChangeUserShare(e)}
                  />
                </DialogContent>
                <DialogActions>
                  <Button onClick={() => this._handleCloseUserShare()} color="secondary">
                    Cancel
                  </Button>
                  <Button onClick={() => this._onShareClick()} color="secondary">
                    Submit
                  </Button>
                </DialogActions>
              </Dialog>
              <Button className="toolbar-btn" onClick={()=>this.props.setNull()}>
                <Home/>
              </Button>
            </Toolbar>
          </AppBar>
        </div>
        <div className="toolbar">
          <Button value="BOLD" className="toolbar-btn" onClick={(e) => this._toggleStyle(e)}>
            <FormatBold />
          </Button>
          <Button value="ITALIC" className="toolbar-btn" onClick={(e) => this._toggleStyle(e)}>
            <FormatItalic />
          </Button>
          <Button value="UNDERLINE" className="toolbar-btn" onClick={(e) => this._toggleStyle(e)}>
            <FormatUnderlined />
          </Button>
          <Button value="STRIKETHROUGH" className="toolbar-btn" onClick={(e) => this._toggleStyle(e)}>
            <FormatStrikethrough />
          </Button>
          <Button className="toolbar-btn" onClick={() => this._onLeftAlignClick()}>
            <FormatAlignLeft />
          </Button>
          <Button className="toolbar-btn" onClick={() => this._onCenterAlignClick()}>
            <FormatAlignCenter />
          </Button>
          <Button className="toolbar-btn" onClick={() => this._onRightAlignClick()}>
            <FormatAlignRight />
          </Button>
          <Button value="HIGHLIGHT" className="toolbar-btn" onClick={(e) => this._toggleStyle(e)}>
            <BorderColor />
          </Button>

          <FontMenu
            _handleMenuClose={(e)=>this._handleMenuClose(e)}
            _setFontAnchorEl={(e)=>this._setFontAnchorEl(e)}
            _handleFontChange={(e)=>this._hangleFontChange(e)}
            fontOpen={fontOpen}
            fontAnchorEl={fontAnchorEl}
          >
          </FontMenu>
          <ColorMenu
            _handleMenuClose={(e)=>this._handleMenuClose(e)}
            _setColorAnchorEl={(e)=>this._setColorAnchorEl(e)}
            _handleColorChange={(e)=>this._hangleColorChange(e)}
            colorOpen={colorOpen}
            colorAnchorEl={colorAnchorEl}
          >
          </ColorMenu>
        </div>
        <Paper className="editorPaper">
        <div className="editor" onClick={() => this._HandleFocus()}>
          <Editor
            blockStyleFn={blockStyleFn}
            customStyleFn={customStyleFn}
            editorState={this.state.editorState}
            onChange={this.onChange}
            ref={this.setDomEditorRef}
            handleKeyCommand={this.handleKeyCommand}
            customStyleMap={styleMap}
          />
        </div>
        </Paper>
        </MuiThemeProvider>
      </div>
    )
  }
}

export default Document;
