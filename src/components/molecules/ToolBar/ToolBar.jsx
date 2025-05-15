import React from 'react'
import styles from './ToolBar.module.scss'
import { Button } from '../../atoms'
import { Eraser, MoveLeft, PaletteIcon, Pen } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const ToolBar = () => {
  const navigate = useNavigate();

  const handleBackButtonClick = () => {
    navigate('/');
  }
  return (
    <div className = {styles.toolbar_cover}>
      <div className={styles.toolbar_tools_cover}>
        <div className={styles.toolbar_back_button}>
          <Button Icon={MoveLeft} label={"back"} onClick={handleBackButtonClick}/>
        </div>
        <div className={styles.toolbar_tools}>
           <Button Icon={Pen} label={"pen"}/> 
           <Button Icon={Eraser} label={"eraser"}/>
           <Button Icon={PaletteIcon}/>
        </div>
      </div>
    </div>
  )
}

export default ToolBar
